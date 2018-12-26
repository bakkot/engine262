import {
  Assert,
  Call,
  DeletePropertyOrThrow,
  Get,
  HasProperty,
  Invoke,
  IsCallable,
  SameValueZero,
  Set,
  StrictEqualityComparison,
  ToBoolean,
  ToInteger,
  ToLength,
  ToObject,
  ToString,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { Type, Value } from '../value.mjs';
import { assignProps } from './Bootstrap.mjs';

// Algorithms shared between %ArrayPrototype% and %TypedArrayPrototype%.

export function CreateArrayPrototypeShared(realmRec, proto, priorToEvaluatingAlgorithm, objectToLength) {
  // 22.1.3.5 #sec-array.prototype.every
  // 22.2.3.7 #sec-%typedarray%.prototype.every
  function ArrayProto_every([callbackFn, thisArg], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const lenProp = Q(objectToLength(O));
    const len = Q(ToLength(lenProp));
    if (IsCallable(callbackFn) === Value.false) {
      return surroundingAgent.Throw('TypeError');
    }
    let T;
    if (thisArg !== undefined) {
      T = thisArg;
    } else {
      T = Value.undefined;
    }
    let k = 0;
    while (k < len.numberValue()) {
      const Pk = X(ToString(new Value(k)));
      const kPresent = Q(HasProperty(O, Pk));
      if (kPresent === Value.true) {
        const kValue = Q(Get(O, Pk));
        const testResult = ToBoolean(Q(Call(callbackFn, T, [kValue, new Value(k), O])));
        if (testResult === Value.false) {
          return Value.false;
        }
      }
      k += 1;
    }
    return Value.true;
  }

  // 22.1.3.8 #sec-array.prototype.find
  // 22.2.3.10 #sec-%typedarray%.prototype.find
  function ArrayProto_find([predicate, thisArg], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const lenProp = Q(objectToLength(O));
    const len = Q(ToLength(lenProp)).numberValue();
    if (IsCallable(predicate) === Value.false) {
      return surroundingAgent.Throw('TypeError', 'predicate is not callable');
    }
    const T = thisArg || Value.undefined;
    let k = 0;
    while (k < len) {
      const Pk = X(ToString(new Value(k)));
      const kValue = Q(Get(O, Pk));
      const testResult = ToBoolean(Q(Call(predicate, T, [kValue, new Value(k), O])));
      if (testResult === Value.true) {
        return kValue;
      }
      k += 1;
    }
    return Value.undefined;
  }

  // 22.1.3.9 #sec-array.prototype.findindex
  // 22.2.3.11 #sec-%typedarray%.prototype.findindex
  function ArrayProto_findIndex([predicate, thisArg], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const lenProp = Q(objectToLength(O));
    const len = Q(ToLength(lenProp)).numberValue();
    if (IsCallable(predicate) === Value.false) {
      return surroundingAgent.Throw('TypeError', 'predicate is not callable');
    }
    const T = thisArg || Value.undefined;
    let k = 0;
    while (k < len) {
      const Pk = X(ToString(new Value(k)));
      const kValue = Q(Get(O, Pk));
      const testResult = ToBoolean(Q(Call(predicate, T, [kValue, new Value(k), O])));
      if (testResult === Value.true) {
        return new Value(k);
      }
      k += 1;
    }
    return new Value(-1);
  }

  // 22.1.3.10 #sec-array.prototype.foreach
  // 22.2.3.12 #sec-%typedarray%.prototype.foreach
  function ArrayProto_forEach([callbackfn, thisArg], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const lenProp = Q(objectToLength(O));
    const len = Q(ToLength(lenProp)).numberValue();
    if (IsCallable(callbackfn) === Value.false) {
      return surroundingAgent.Throw('TypeError', 'callbackfn is not callable');
    }
    const T = thisArg || Value.undefined;
    let k = 0;
    while (k < len) {
      const Pk = X(ToString(new Value(k)));
      const kPresent = Q(HasProperty(O, Pk));
      if (kPresent === Value.true) {
        const kValue = Q(Get(O, Pk));
        Q(Call(callbackfn, T, [kValue, new Value(k), O]));
      }
      k += 1;
    }
    return Value.undefined;
  }

  // 22.1.3.11 #sec-array.prototype.includes
  // 22.2.3.13 #sec-%typedarray%.prototype.includes
  function ArrayProto_includes([searchElement, fromIndex], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const lenProp = Q(objectToLength(O));
    const len = Q(ToLength(lenProp)).numberValue();
    if (len === 0) {
      return Value.false;
    }
    let n;
    if (fromIndex !== undefined) {
      n = Q(ToInteger(fromIndex)).numberValue();
    } else {
      n = 0;
    }
    let k;
    if (n >= 0) {
      k = n;
    } else {
      k = len + n;
      if (k < 0) {
        k = 0;
      }
    }
    while (k < len) {
      const kStr = X(ToString(new Value(k)));
      const elementK = Q(Get(O, kStr));
      if (SameValueZero(searchElement, elementK) === Value.true) {
        return Value.true;
      }
      k += 1;
    }
    return Value.false;
  }

  // 22.1.3.12 #sec-array.prototype.indexof
  // 22.2.3.14 #sec-%typedarray%.prototype.indexof
  function ArrayProto_indexOf([searchElement, fromIndex = Value.undefined], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const lenProp = Q(objectToLength(O));
    const len = Q(ToLength(lenProp)).numberValue();
    if (len === 0) {
      return new Value(-1);
    }
    const n = Q(ToInteger(fromIndex)).numberValue();
    // Assert: If fromIndex is undefined, then n is 0.
    Assert(!(fromIndex === Value.undefined) || n === 0);
    if (n >= len) {
      return new Value(-1);
    }
    let k;
    if (n >= 0) {
      if (Object.is(-0, n)) {
        k = 0;
      } else {
        k = n;
      }
    } else {
      k = len + n;
      if (k < 0) {
        k = 0;
      }
    }
    while (k < len) {
      const kPresent = Q(HasProperty(O, X(ToString(new Value(k)))));
      if (kPresent === Value.true) {
        const elementK = Q(Get(O, X(ToString(new Value(k)))));
        const same = StrictEqualityComparison(searchElement, elementK);
        if (same === Value.true) {
          return new Value(k);
        }
      }
      k += 1;
    }
    return new Value(-1);
  }

  // 22.1.3.13 #sec-array.prototype.join
  // 22.2.3.15 #sec-%typedarray%.prototype.join
  function ArrayProto_join([separator = Value.undefined], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const lenProp = Q(objectToLength(O));
    const len = Q(ToLength(lenProp)).numberValue();
    let sep;
    if (Type(separator) === 'Undefined') {
      sep = ',';
    } else {
      sep = Q(ToString(separator)).stringValue();
    }
    let R = '';
    let k = 0;
    while (k < len) {
      if (k > 0) {
        R = `${R}${sep}`;
      }
      const kStr = X(ToString(new Value(k)));
      const element = Q(Get(O, kStr));
      let next;
      if (Type(element) === 'Undefined' || Type(element) === 'Null') {
        next = '';
      } else {
        next = Q(ToString(element)).stringValue();
      }
      R = `${R}${next}`;
      k += 1;
    }
    return new Value(R);
  }

  // 22.1.3.15 #sec-array.prototype.lastindexof
  // 22.2.3.17 #sec-%typedarray%.prototype.lastindexof
  function ArrayProto_lastIndexOf([searchElement, fromIndex], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const lenProp = Q(objectToLength(O));
    const len = Q(ToLength(lenProp)).numberValue();
    if (len === 0) {
      return new Value(-1);
    }
    let n;
    if (fromIndex !== undefined) {
      n = Q(ToInteger(fromIndex)).numberValue();
    } else {
      n = len - 1;
    }
    let k;
    if (n >= 0) {
      if (Object.is(n, -0)) {
        k = 0;
      } else {
        k = Math.min(n, len - 1);
      }
    } else {
      k = len + n;
    }
    while (k >= 0) {
      const kStr = X(ToString(new Value(k)));
      const kPresent = Q(HasProperty(O, kStr));
      if (kPresent === Value.true) {
        const elementK = Q(Get(O, kStr));
        const same = StrictEqualityComparison(searchElement, elementK);
        if (same === Value.true) {
          return new Value(k);
        }
      }
      k -= 1;
    }
    return new Value(-1);
  }

  // 22.1.3.19 #sec-array.prototype.reduce
  // 22.2.3.20 #sec-%typedarray%.prototype.reduce
  function ArrayProto_reduce([callbackfn, initialValue], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const lenProp = Q(objectToLength(O));
    const len = Q(ToLength(lenProp)).numberValue();
    if (IsCallable(callbackfn) === Value.false) {
      return surroundingAgent.Throw('TypeError');
    }
    if (len === 0 && initialValue === undefined) {
      return surroundingAgent.Throw('TypeError', 'Reduce of empty array with no initial value');
    }
    let k = 0;
    let accumulator = Value.undefined;
    if (initialValue !== undefined) {
      accumulator = initialValue;
    } else {
      let kPresent = false;
      while (kPresent === false && k < len) {
        const Pk = X(ToString(new Value(k)));
        kPresent = Q(HasProperty(O, Pk)) === Value.true;
        if (kPresent === true) {
          accumulator = Q(Get(O, Pk));
        }
        k += 1;
      }
      if (kPresent === false) {
        return surroundingAgent.Throw('TypeError');
      }
    }
    while (k < len) {
      const Pk = X(ToString(new Value(k)));
      const kPresent = Q(HasProperty(O, Pk));
      if (kPresent === Value.true) {
        const kValue = Q(Get(O, Pk));
        accumulator = Q(Call(callbackfn, Value.undefined, [accumulator, kValue, new Value(k), O]));
      }
      k += 1;
    }
    return accumulator;
  }

  // 22.1.3.20 #sec-array.prototype.reduceright
  // 22.2.3.21 #sec-%typedarray%.prototype.reduceright
  function ArrayProto_reduceRight([callbackfn, initialValue], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const lenProp = Q(objectToLength(O));
    const len = Q(ToLength(lenProp)).numberValue();
    if (IsCallable(callbackfn) === Value.false) {
      return surroundingAgent.Throw('TypeError');
    }
    if (len === 0 && initialValue === undefined) {
      return surroundingAgent.Throw('TypeError', 'Reduce of empty array with no initial value');
    }
    let k = len - 1;
    let accumulator = Value.undefined;
    if (initialValue !== undefined) {
      accumulator = initialValue;
    } else {
      let kPresent = false;
      while (kPresent === false && k >= 0) {
        const Pk = X(ToString(new Value(k)));
        kPresent = Q(HasProperty(O, Pk)) === Value.true;
        if (kPresent === true) {
          accumulator = Q(Get(O, Pk));
        }
        k -= 1;
      }
      if (kPresent === false) {
        return surroundingAgent.Throw('TypeError');
      }
    }
    while (k >= 0) {
      const Pk = X(ToString(new Value(k)));
      const kPresent = Q(HasProperty(O, Pk));
      if (kPresent === Value.true) {
        const kValue = Q(Get(O, Pk));
        accumulator = Q(Call(callbackfn, Value.undefined, [accumulator, kValue, new Value(k), O]));
      }
      k -= 1;
    }
    return accumulator;
  }

  // 22.1.3.21 #sec-array.prototype.reverse
  // 22.2.3.22 #sec-%typedarray%.prototype.reverse
  function ArrayProto_reverse(args, { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const lenProp = Q(objectToLength(O));
    const len = Q(ToLength(lenProp)).numberValue();
    const middle = Math.floor(len / 2);
    let lower = 0;
    while (lower !== middle) {
      const upper = len - lower - 1;
      const upperP = X(ToString(new Value(upper)));
      const lowerP = X(ToString(new Value(lower)));
      const lowerExists = Q(HasProperty(O, lowerP));
      let lowerValue;
      let upperValue;
      if (lowerExists === Value.true) {
        lowerValue = Q(Get(O, lowerP));
      }
      const upperExists = Q(HasProperty(O, upperP));
      if (upperExists === Value.true) {
        upperValue = Q(Get(O, upperP));
      }
      if (lowerExists === Value.true && upperExists === Value.true) {
        Q(Set(O, lowerP, upperValue, Value.true));
        Q(Set(O, upperP, lowerValue, Value.true));
      } else if (lowerExists === Value.false && upperExists === Value.true) {
        Q(Set(O, lowerP, upperValue, Value.true));
        Q(DeletePropertyOrThrow(O, upperP));
      } else if (lowerExists === Value.true && upperExists === Value.false) {
        Q(DeletePropertyOrThrow(O, lowerP));
        Q(Set(O, upperP, lowerValue, Value.true));
      } else {
        // no further action is required
      }
      lower += 1;
    }
    return O;
  }

  // 22.1.3.24 #sec-array.prototype.some
  // 22.2.3.25 #sec-%typedarray%.prototype.some
  function ArrayProto_some([callbackfn, thisArg], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const lenProp = Q(objectToLength(O));
    const len = Q(ToLength(lenProp)).numberValue();
    if (IsCallable(callbackfn) === Value.false) {
      return surroundingAgent.Throw('TypeError');
    }
    let T;
    if (thisArg !== undefined) {
      T = thisArg;
    } else {
      T = Value.undefined;
    }
    let k = 0;
    while (k < len) {
      const Pk = X(ToString(new Value(k)));
      const kPresent = Q(HasProperty(O, Pk));
      if (kPresent === Value.true) {
        const kValue = Q(Get(O, Pk));
        const testResult = ToBoolean(Q(Call(callbackfn, T, [kValue, new Value(k), O])));
        if (testResult === Value.true) {
          return Value.true;
        }
      }
      k += 1;
    }
    return Value.false;
  }

  // 22.2.3.26 #sec-%typedarray%.prototype.sort
  // Missing.

  // 22.1.3.27 #sec-array.prototype.tolocalestring
  // 22.2.3.28 #sec-%typedarray%.prototype.tolocalestring
  function ArrayProto_toLocaleString(args, { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const array = Q(ToObject(thisValue));
    const lenProp = Q(objectToLength(array));
    const len = Q(ToLength(lenProp)).numberValue();
    const separator = ', ';
    let R = '';
    let k = 0;
    while (k < len) {
      if (k > 0) {
        R = `${R}${separator}`;
      }
      const kStr = X(ToString(new Value(k)));
      const nextElement = Q(Get(array, kStr));
      if (nextElement !== Value.undefined && nextElement !== Value.null) {
        const res = Q(Invoke(nextElement, new Value('toLocaleString')));
        const S = Q(ToString(res)).stringValue();
        R = `${R}${S}`;
      }
      k += 1;
    }
    return new Value(R);
  }

  assignProps(realmRec, proto, [
    ['every', ArrayProto_every, 1],
    ['find', ArrayProto_find, 1],
    ['findIndex', ArrayProto_findIndex, 1],
    ['forEach', ArrayProto_forEach, 1],
    ['includes', ArrayProto_includes, 1],
    ['indexOf', ArrayProto_indexOf, 1],
    ['join', ArrayProto_join, 1],
    ['lastIndexOf', ArrayProto_lastIndexOf, 1],
    ['reduce', ArrayProto_reduce, 1],
    ['reduceRight', ArrayProto_reduceRight, 1],
    ['reverse', ArrayProto_reverse, 0],
    ['some', ArrayProto_some, 1],
    // sort
    ['toLocaleString', ArrayProto_toLocaleString, 0],
  ]);
}