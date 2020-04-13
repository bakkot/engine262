import { surroundingAgent } from '../engine.mjs';
import { Value, Descriptor } from '../value.mjs';
import {
  Assert,
  GetValue,
  OrdinaryFunctionCreate,
  CreateDataPropertyOrThrow,
  DefinePropertyOrThrow,
  SetFunctionName,
  MakeMethod,
  sourceTextMatchedBy,
} from '../abstract-ops/all.mjs';
import { StringValue, IsAnonymousFunctionDefinition } from '../static-semantics/all.mjs';
import { Evaluate } from '../evaluator.mjs';
import { ReturnIfAbrupt, Q, X } from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';
import { NamedEvaluation, DefineMethod, Evaluate_PropertyName } from './all.mjs';

// #sec-object-initializer-runtime-semantics-propertydefinitionevaluation
//   PropertyDefinitionList :
//     PropertyDefinitionList `,` PropertyDefinition
export function* PropertyDefinitionEvaluation_PropertyDefinitionList(PropertyDefinitionList, object, enumerable) {
  let lastReturn;
  for (const PropertyDefinition of PropertyDefinitionList) {
    lastReturn = Q(yield* PropertyDefinitionEvaluation_PropertyDefinition(
      PropertyDefinition, object, enumerable,
    ));
  }
  return lastReturn;
}

// PropertyDefinition :
//   `...` AssignmentExpression
//   IdentifierReference
//   PropertyName `:` AssignmentExpression
function* PropertyDefinitionEvaluation_PropertyDefinition(PropertyDefinition, object, enumerable) {
  switch (PropertyDefinition.type) {
    case 'IdentifierReference':
      return yield* PropertyDefinitionEvaluation_PropertyDefinition_IdentifierReference(PropertyDefinition, object, enumerable);
    case 'PropertyDefinition':
      break;
    case 'MethodDefinition':
      return yield* PropertyDefinitionEvaluation_MethodDefinition(PropertyDefinition, object, enumerable);
    default:
      throw new OutOfRange('PropertyDefinitionEvaluation_PropertyDefinition', PropertyDefinition);
  }
  // PropertyDefinition : PropertyName `:` AssignmentExpression
  const { PropertyName, AssignmentExpression } = PropertyDefinition;
  // 1. Let propKey be the result of evaluating PropertyName.
  const propKey = yield* Evaluate_PropertyName(PropertyName);
  // 2. ReturnIfAbrupt(propKey).
  ReturnIfAbrupt(propKey);
  let propValue;
  // 3. If IsAnonymousFunctionDefinition(AssignmentExpression) is true, then
  if (IsAnonymousFunctionDefinition(AssignmentExpression)) {
    // a. Let propValue be NamedEvaluation of AssignmentExpression with argument propKey.
    propValue = NamedEvaluation(AssignmentExpression, propKey);
  } else { // 4. Else,
    // a. Let exprValueRef be the result of evaluating AssignmentExpression.
    const exprValueRef = yield* Evaluate(AssignmentExpression);
    // b. Let propValue be ? GetValue(exprValueRef).
    propValue = Q(GetValue(exprValueRef));
  }
  // 5. Assert: enumerable is true.
  Assert(enumerable === Value.true);
  // 6. Assert: object is an ordinary, extensible object with no non-configurable properties.
  // 7. Return ! CreateDataPropertyOrThrow(object, propKey, propValue).
  return X(CreateDataPropertyOrThrow(object, propKey, propValue));
}

// PropertyDefinition : IdentifierReference
function* PropertyDefinitionEvaluation_PropertyDefinition_IdentifierReference(IdentifierReference, object, enumerable) {
  // 1. Let propName be StringValue of IdentifierReference.
  const propName = StringValue(IdentifierReference);
  // 2. Let exprValue be the result of evaluating IdentifierReference.
  const exprValue = yield* Evaluate(IdentifierReference);
  // 3. Let propValue be ? GetValue(exprValue).
  const propValue = Q(GetValue(exprValue));
  // 4. Assert: enumerable is true.
  Assert(enumerable === Value.true);
  // 5. Assert: object is an ordinary, extensible object with no non-configurable properties.
  // 6. Return ! CreateDataPropertyOrThrow(object, propName, propValue).
  return X(CreateDataPropertyOrThrow(object, propName, propValue));
}

// MethodDefinition :
//   PropertyName `(` UniqueFormalParameters `)` `{` FunctionBody `}`
//   `get` PropertyName `(` `)` `{` FunctionBody `}`
//   `set` PropertyName `(` PropertySetParameterList `)` `{` FunctionBody `}`
function* PropertyDefinitionEvaluation_MethodDefinition(MethodDefinition, object, enumerable) {
  switch (true) {
    case MethodDefinition.UniqueFormalParameters !== null: {
      // 1. Let methodDef be ? DefineMethod of MethodDefinition with argument object.
      const methodDef = Q(yield* DefineMethod(MethodDefinition, object));
      // 2. Perform SetFunctionName(methodDef.[[Closure]], methodDef.[[Key]]).
      SetFunctionName(methodDef.Closure, methodDef.Key);
      // 3. Let desc be the PropertyDescriptor { [[Value]]: methodDef.[[Closure]], [[Writable]]: true, [[Enumerable]]: enumerable, [[Configurable]]: true }.
      const desc = Descriptor({
        Value: methodDef.Closure,
        Writable: Value.true,
        Enumerable: enumerable,
        Configurable: Value.true,
      });
      // 4. Return ? DefinePropertyOrThrow(object, methodDef.[[Key]], desc).
      return Q(DefinePropertyOrThrow(object, methodDef.Key, desc));
    }
    case MethodDefinition.PropertySetParameterList !== null: {
      const { PropertyName, PropertySetParameterList, FunctionBody } = MethodDefinition;
      // 1. Let propKey be the result of evaluating PropertyName.
      const propKey = yield* Evaluate_PropertyName(PropertyName);
      // 2. ReturnIfAbrupt(propKey).
      ReturnIfAbrupt(propKey);
      // 3. Let scope be the running execution context's LexicalEnvironment.
      const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
      // 4. Let closure be OrdinaryFunctionCreate(%Function.prototype%, PropertySetParameterList, FunctionBody, non-lexical-this, scope).
      const closure = OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Function.prototype%'), PropertySetParameterList, FunctionBody, 'non-lexical-this', scope);
      // 5. Perform MakeMethod(closure, object).
      MakeMethod(closure, object);
      // 6. Perform SetFunctionName(closure, propKey, "get").
      SetFunctionName(closure, propKey, new Value('set'));
      // 7. Set closure.[[SourceText]] to the source text matched by MethodDefinition.
      closure.SourceText = sourceTextMatchedBy(MethodDefinition);
      // 8. Let desc be the PropertyDescriptor { [[Get]]: closure, [[Enumerable]]: enumerable, [[Configurable]]: true }.
      const desc = Descriptor({
        Set: closure,
        Enumerable: enumerable,
        Configurable: Value.true,
      });
      // 9. Return ? DefinePropertyOrThrow(object, propKey, desc).
      return Q(DefinePropertyOrThrow(object, propKey, desc));
    }
    case MethodDefinition.UniqueFormalParameters === null
        && MethodDefinition.PropertySetParameterList === null: {
      const { PropertyName, FunctionBody } = MethodDefinition;
      // 1. Let propKey be the result of evaluating PropertyName.
      const propKey = yield* Evaluate_PropertyName(PropertyName);
      // 2. ReturnIfAbrupt(propKey).
      ReturnIfAbrupt(propKey);
      // 3. Let scope be the running execution context's LexicalEnvironment.
      const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
      // 4. Let formalParameterList be an instance of the production FormalParameters : [empty].
      const formalParameterList = [];
      // 5. Let closure be OrdinaryFunctionCreate(%Function.prototype%, formalParameterList, FunctionBody, non-lexical-this, scope).
      const closure = OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Function.prototype%'), formalParameterList, FunctionBody, 'non-lexical-this', scope);
      // 6. Perform MakeMethod(closure, object).
      MakeMethod(closure, object);
      // 7. Perform SetFunctionName(closure, propKey, "get").
      SetFunctionName(closure, propKey, new Value('get'));
      // 8. Set closure.[[SourceText]] to the source text matched by MethodDefinition.
      closure.SourceText = sourceTextMatchedBy(MethodDefinition);
      // 9. Let desc be the PropertyDescriptor { [[Get]]: closure, [[Enumerable]]: enumerable, [[Configurable]]: true }.
      const desc = Descriptor({
        Get: closure,
        Enumerable: enumerable,
        Configurable: Value.true,
      });
      // 10. Return ? DefinePropertyOrThrow(object, propKey, desc).
      return Q(DefinePropertyOrThrow(object, propKey, desc));
    }
    default:
      throw new OutOfRange('PropertyDefinitionEvaluation_MethodDefinition', MethodDefinition);
  }
}

export function PropertyDefinitionEvaluation(node, object, enumerable) {
  switch (node.type) {
    case 'MethodDefinition':
      return PropertyDefinitionEvaluation_MethodDefinition(node, object, enumerable);
    case 'ClassElement':
      return PropertyDefinitionEvaluation(node.MethodDefinition, object, enumerable);
    default:
      throw new OutOfRange('PropertyDefinitionEvaluation', node);
  }
}
