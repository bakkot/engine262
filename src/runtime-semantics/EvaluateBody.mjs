import { surroundingAgent } from '../engine.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import {
  Assert,
  Call,
  CreateListIteratorRecord,
  CreateMappedArgumentsObject,
  CreateUnmappedArgumentsObject,
  GeneratorStart,
  GetValue,
  OrdinaryCreateFromConstructor,
  AsyncFunctionStart,
  NewPromiseCapability,
} from '../abstract-ops/all.mjs';
import {
  isArrowFunction,
  isAsyncArrowFunction,
  isAsyncFunctionDeclaration,
  isAsyncFunctionExpression,
  isAsyncGeneratorDeclaration,
  isBindingIdentifier,
  isForBinding,
  isFunctionDeclaration,
  isFunctionExpression,
  isGeneratorDeclaration,
  isGeneratorExpression,
  isVariableDeclaration,
} from '../ast.mjs';
import {
  BoundNames_Declaration,
  BoundNames_FormalParameters,
  BoundNames_FunctionDeclaration,
  ContainsExpression,
  IsConstantDeclaration,
  IsSimpleParameterList,
  LexicallyDeclaredNames_ConciseBody,
  LexicallyDeclaredNames_FunctionBody,
  LexicallyDeclaredNames_GeneratorBody,
  LexicallyDeclaredNames_AsyncFunctionBody,
  LexicallyScopedDeclarations_ConciseBody,
  LexicallyScopedDeclarations_FunctionBody,
  LexicallyScopedDeclarations_GeneratorBody,
  LexicallyScopedDeclarations_AsyncFunctionBody,
  VarDeclaredNames_ConciseBody,
  VarDeclaredNames_FunctionBody,
  VarDeclaredNames_GeneratorBody,
  VarDeclaredNames_AsyncFunctionBody,
  VarScopedDeclarations_ConciseBody,
  VarScopedDeclarations_FunctionBody,
  VarScopedDeclarations_GeneratorBody,
  VarScopedDeclarations_AsyncFunctionBody,
} from '../static-semantics/all.mjs';
import {
  Completion,
  NormalCompletion,
  AbruptCompletion,
  ReturnCompletion,
  Q, X,
} from '../completion.mjs';
import {
  NewDeclarativeEnvironment,
} from '../environment.mjs';
import { outOfRange } from '../helpers.mjs';
import {
  InstantiateFunctionObject,
  Evaluate_FunctionStatementList,
  IteratorBindingInitialization_FormalParameters,
} from './all.mjs';
import { Value } from '../value.mjs';

// #sec-functiondeclarationinstantiation
export function* FunctionDeclarationInstantiation(func, argumentsList) {
  const calleeContext = surroundingAgent.runningExecutionContext;
  const env = calleeContext.LexicalEnvironment;
  const envRec = env.EnvironmentRecord;
  const code = func.ECMAScriptCode;
  const strict = func.Strict;
  const formals = func.FormalParameters;
  const parameterNames = BoundNames_FormalParameters(formals).map(Value);
  const hasDuplicates = !parameterNames.every(
    (e) => parameterNames.indexOf(e) === parameterNames.lastIndexOf(e),
  );
  const simpleParameterList = IsSimpleParameterList(formals);
  const hasParameterExpressions = ContainsExpression(formals);

  let varNames;
  let varDeclarations;
  let lexicalNames;

  switch (getFunctionBodyType(code)) {
    case 'FunctionBody':
      varNames = VarDeclaredNames_FunctionBody(code.body.body).map(Value);
      varDeclarations = VarScopedDeclarations_FunctionBody(code.body.body);
      lexicalNames = LexicallyDeclaredNames_FunctionBody(code.body.body).map(Value);
      break;
    case 'ConciseBody_Expression':
    case 'ConciseBody_FunctionBody':
    case 'AsyncConciseBody_AsyncFunctionBody':
    case 'AsyncConciseBody_AssignmentExpression':
      varNames = VarDeclaredNames_ConciseBody(code.body).map(Value);
      varDeclarations = VarScopedDeclarations_ConciseBody(code.body);
      lexicalNames = LexicallyDeclaredNames_ConciseBody(code.body).map(Value);
      break;
    case 'GeneratorBody':
      varNames = VarDeclaredNames_GeneratorBody(code.body.body).map(Value);
      varDeclarations = VarScopedDeclarations_GeneratorBody(code.body.body);
      lexicalNames = LexicallyDeclaredNames_GeneratorBody(code.body.body).map(Value);
      break;
    case 'AsyncFunctionBody':
      varNames = VarDeclaredNames_AsyncFunctionBody(code.body.body).map(Value);
      varDeclarations = VarScopedDeclarations_AsyncFunctionBody(code.body.body);
      lexicalNames = LexicallyDeclaredNames_AsyncFunctionBody(code.body.body).map(Value);
      break;
    default:
      throw outOfRange('FunctionDeclarationInstantiation', code);
  }

  const functionNames = [];
  const functionsToInitialize = [];

  for (const d of [...varDeclarations].reverse()) {
    if (!isVariableDeclaration(d) && !isForBinding(d) && !isBindingIdentifier(d)) {
      Assert(isFunctionDeclaration(d) || isGeneratorDeclaration(d)
             || isAsyncFunctionDeclaration(d) || isAsyncGeneratorDeclaration(d));
      const fn = BoundNames_FunctionDeclaration(d)[0];
      if (!functionNames.includes(fn)) {
        functionNames.unshift(fn);
        functionsToInitialize.unshift(d);
      }
    }
  }

  let argumentsObjectNeeded = true;
  if (func.ThisMode === 'lexical') {
    argumentsObjectNeeded = false;
  } else if (parameterNames.includes(new Value('arguments'))) {
    argumentsObjectNeeded = false;
  } else if (hasParameterExpressions === false) {
    if (functionNames.includes(new Value('arguments'))
        || lexicalNames.includes(new Value('arguments'))) {
      argumentsObjectNeeded = false;
    }
  }

  for (const paramName of parameterNames) {
    const alreadyDeclared = envRec.HasBinding(paramName);
    if (alreadyDeclared === Value.false) {
      X(envRec.CreateMutableBinding(paramName, false));
      if (hasDuplicates === true) {
        X(envRec.InitializeBinding(paramName, Value.undefined));
      }
    }
  }

  let parameterBindings;
  if (argumentsObjectNeeded === true) {
    let ao;
    if (strict || simpleParameterList === false) {
      ao = CreateUnmappedArgumentsObject(argumentsList);
    } else {
      ao = CreateMappedArgumentsObject(func, formals, argumentsList, envRec);
    }
    if (strict) {
      X(envRec.CreateImmutableBinding(new Value('arguments'), Value.false));
    } else {
      X(envRec.CreateMutableBinding(new Value('arguments'), false));
    }
    envRec.InitializeBinding(new Value('arguments'), ao);
    parameterBindings = [...parameterNames, new Value('arguments')];
  } else {
    parameterBindings = parameterNames;
  }

  const iteratorRecord = CreateListIteratorRecord(argumentsList);
  if (hasDuplicates) {
    Q(yield* IteratorBindingInitialization_FormalParameters(formals, iteratorRecord, Value.undefined));
  } else {
    Q(yield* IteratorBindingInitialization_FormalParameters(formals, iteratorRecord, env));
  }

  let varEnv;
  let varEnvRec;
  if (hasParameterExpressions === false) {
    const instantiatedVarNames = [...parameterBindings];
    for (const n of varNames) {
      if (!instantiatedVarNames.includes(n)) {
        instantiatedVarNames.push(n);
        X(envRec.CreateMutableBinding(n, false));
        envRec.InitializeBinding(n, Value.undefined);
      }
    }
    varEnv = env;
    varEnvRec = envRec;
  } else {
    varEnv = NewDeclarativeEnvironment(env);
    varEnvRec = varEnv.EnvironmentRecord;
    calleeContext.VariableEnvironment = varEnv;
    const instantiatedVarNames = [];
    for (const n of varNames) {
      if (!instantiatedVarNames.includes(n)) {
        instantiatedVarNames.push(n);
        X(varEnvRec.CreateMutableBinding(n, false));
        let initialValue;
        if (!parameterBindings.includes(n) || functionNames.includes(n)) {
          initialValue = Value.undefined;
        } else {
          initialValue = envRec.GetBindingValue(n, Value.false);
        }
        varEnvRec.InitializeBinding(n, initialValue);
      }
    }
  }

  // NOTE: Annex B.3.3.1 adds additional steps at this point.

  let lexEnv;
  if (strict === false) {
    lexEnv = NewDeclarativeEnvironment(varEnv);
  } else {
    lexEnv = varEnv;
  }

  const lexEnvRec = lexEnv.EnvironmentRecord;
  lexEnv.EnvironmentRecord = lexEnvRec;
  calleeContext.LexicalEnvironment = lexEnv;

  let lexDeclarations;
  switch (getFunctionBodyType(code)) {
    case 'FunctionBody':
      lexDeclarations = LexicallyScopedDeclarations_FunctionBody(code.body.body);
      break;
    case 'ConciseBody_Expression':
    case 'ConciseBody_FunctionBody':
    case 'AsyncConciseBody_AssignmentExpression':
    case 'AsyncConciseBody_AsyncFunctionBody':
      lexDeclarations = LexicallyScopedDeclarations_ConciseBody(code.body);
      break;
    case 'GeneratorBody':
      lexDeclarations = LexicallyScopedDeclarations_GeneratorBody(code.body.body);
      break;
    case 'AsyncFunctionBody':
      lexDeclarations = LexicallyScopedDeclarations_AsyncFunctionBody(code.body.body);
      break;
    default:
      throw outOfRange('FunctionDeclarationInstantiation', code);
  }
  for (const d of lexDeclarations) {
    for (const dn of BoundNames_Declaration(d).map(Value)) {
      if (IsConstantDeclaration(d)) {
        X(lexEnvRec.CreateImmutableBinding(dn, Value.true));
      } else {
        X(lexEnvRec.CreateMutableBinding(dn, false));
      }
    }
  }

  for (const f of functionsToInitialize) {
    const fn = BoundNames_FunctionDeclaration(f)[0];
    const fo = InstantiateFunctionObject(f, lexEnv);
    X(varEnvRec.SetMutableBinding(new Value(fn), fo, Value.false));
  }

  return new NormalCompletion(undefined);
}

export function getFunctionBodyType(ECMAScriptCode) {
  switch (true) {
    // FunctionBody : FunctionStatementList
    case isFunctionDeclaration(ECMAScriptCode)
      || isFunctionExpression(ECMAScriptCode): // includes MethodDefinitions
      return 'FunctionBody';

    // ConciseBody : `{` FunctionBody `}`
    case isArrowFunction(ECMAScriptCode) && !ECMAScriptCode.expression:
      return 'ConciseBody_FunctionBody';

    // ConciseBody : AssignmentExpression
    case isArrowFunction(ECMAScriptCode) && ECMAScriptCode.expression:
      return 'ConciseBody_Expression';

    case isAsyncArrowFunction(ECMAScriptCode) && !ECMAScriptCode.expression:
      return 'AsyncConciseBody_AsyncFunctionBody';

    case isAsyncArrowFunction(ECMAScriptCode) && ECMAScriptCode.expression:
      return 'AsyncConciseBody_AssignmentExpression';

    // GeneratorBody : FunctionBody
    case isGeneratorDeclaration(ECMAScriptCode)
      || isGeneratorExpression(ECMAScriptCode):
      return 'GeneratorBody';

    // AsyncFunctionBody : FunctionBody
    case isAsyncFunctionDeclaration(ECMAScriptCode)
      || isAsyncFunctionExpression(ECMAScriptCode):
      return 'AsyncFunctionBody';

    default:
      throw outOfRange('getFunctionBodyType', ECMAScriptCode);
  }
}

// #sec-arrow-function-definitions-runtime-semantics-evaluatebody
// ConciseBody : AssignmentExpression
export function* EvaluateBody_ConciseBody_Expression(AssignmentExpression, functionObject, argumentsList) {
  Q(yield* FunctionDeclarationInstantiation(functionObject, argumentsList));
  const exprRef = yield* Evaluate_Expression(AssignmentExpression);
  const exprValue = Q(GetValue(exprRef));
  return new ReturnCompletion(exprValue);
}

// #sec-function-definitions-runtime-semantics-evaluatebody
// FunctionBody : FunctionStatementList
export function* EvaluateBody_FunctionBody(FunctionStatementList, functionObject, argumentsList) {
  Q(yield* FunctionDeclarationInstantiation(functionObject, argumentsList));
  return yield* Evaluate_FunctionStatementList(FunctionStatementList);
}

// #sec-generator-function-definitions-runtime-semantics-evaluatebody
// GeneratorBody : FunctionBody
export function* EvaluateBody_GeneratorBody(GeneratorBody, functionObject, argumentsList) {
  Q(yield* FunctionDeclarationInstantiation(functionObject, argumentsList));
  const G = Q(OrdinaryCreateFromConstructor(functionObject, new Value('%GeneratorPrototype%'), ['GeneratorState', 'GeneratorContext']));
  GeneratorStart(G, GeneratorBody);
  return new ReturnCompletion(G);
}

// #sec-async-function-definitions-EvaluateBody
// AsyncFunctionBody : FunctionBody
export function* EvaluateBody_AsyncFunctionBody(FunctionBody, functionObject, argumentsList) {
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  const declResult = yield* FunctionDeclarationInstantiation(functionObject, argumentsList);
  if (!(declResult instanceof AbruptCompletion)) {
    X(AsyncFunctionStart(promiseCapability, FunctionBody));
  } else {
    X(Call(promiseCapability.Reject, Value.undefined, [declResult.Value]));
  }
  return new Completion('return', promiseCapability.Promise, undefined);
}

// #sec-async-arrow-function-definitions-EvaluateBody
// AsyncConciseBody : AssignmentExpression
export function* EvaluateBody_AsyncConciseBody_AssignmentExpression(AssignmentExpression, functionObject, argumentsList) {
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  const declResult = yield* FunctionDeclarationInstantiation(functionObject, argumentsList);
  if (!(declResult instanceof AbruptCompletion)) {
    X(AsyncFunctionStart(promiseCapability, AssignmentExpression));
  } else {
    X(Call(promiseCapability.Reject, Value.undefined, [declResult.Value]));
  }
  return new Completion('return', promiseCapability.Promise, undefined);
}
