var assert = require('assert');
var escodegen = require('escodegen');
var ir = require('cfg-ir');
var cfg = require('../');

var fixtures = require('./fixtures');
var strip = fixtures.strip;
var equalLines = fixtures.equalLines;

describe('CFG.js/Deconstructor', function() {
  function test(name, input, expected, options) {
    it('should ' + name, function() {
      var repr = ir.parse(
          input.toString().replace(/^function.*{\/\*|\*\/}$/g, '')
      );

      var str = escodegen.generate(cfg.deconstruct(repr, options));

      var exp = expected.toString().replace(/^function.*{|}$/g, '');
      equalLines(strip(str), strip(exp));
    });
  }

  test('global scope returning expression', function() {/*
    block B0
      i1 = literal %1
      i2 = literal %2
      i3 = binary %"+", i1, i2
      ret i3
  */}, function() {
    1 + 2;
  });

  test('non-global scope returning expression', function() {/*
    block B0
      i1 = literal %1
      i2 = literal %2
      i3 = binary %"+", i1, i2
      ret i3
  */}, function() {
    return 1 + 2;
  }, {
    global: false
  });

  test('expression with the same literal in two inputs', function() {/*
    block B0
      i1 = literal %1
      i2 = binary %"+", i1, i1
      ret i2
  */}, function() {
    1 + 1;
  });

  test('call expression', function() {/*
    block B0
      i1 = loadGlobal %"fn" # 3
      i4 = literal %1 # 4
      i6 = literal %2 # 5
      i8 = literal %3 # 6
      i9 = pushArg i8 # 2
      i10 = pushArg i6 # 2
      i11 = pushArg i4 # 2
      i12 = global # 2
      i14 = call i1, i12, %3 # 2
      i15 = ret i14 # 2
  */}, function() {
    fn(1, 2, 3);
  });

  test('context call expression', function() {/*
    block B0
      i1 = loadGlobal %"fn" # 3
      i4 = literal %1 # 4
      i6 = literal %2 # 5
      i8 = literal %3 # 6
      i9 = pushArg i8 # 2
      i10 = pushArg i6 # 2
      i11 = pushArg i4 # 2
      i12 = loadGlobal %"ctx" # 2
      i14 = call i1, i12, %3 # 2
      i15 = ret i14 # 2
  */}, function() {
    fn.call(ctx, 1, 2, 3);
  });

  test('member call expression', function() {/*
    block B0
      i1 = literal %"b" # 3
      i3 = loadGlobal %"a" # 4
      i4 = loadProperty i3, i1 # 3
      i6 = call i4, i3, %0 # 2
      i7 = ret i6 # 2
  */}, function() {
    a.b();
  });

  test('member context call expression', function() {/*
    block B0
      i1 = literal %"b" # 3
      i3 = loadGlobal %"a" # 4
      i4 = loadProperty i3, i1 # 3
      i5 = loadGlobal %"c"
      i6 = call i4, i5, %0 # 2
      i7 = ret i6 # 2
  */}, function() {
    a.b.call(c);
  });

  test('storeGlobal', function() {/*
    block B0
      i1 = literal %"b" # 3
      i3 = storeGlobal %"a", i1
  */}, function() {
    a = 'b';
  });

  test('storeProperty', function() {/*
    block B0
      i1 = literal %"b" # 3
      i2 = loadGlobal %"obj"
      i3 = literal %"a"
      i4 = storeProperty i2, i3, i1
  */}, function() {
    obj.a = 'b';
  });

  test('assignment', function() {/*
    block B0
      @a = literal %"b" # 3
  */}, function() {
    a = 'b';
  });

  test('variables', function() {/*
    block B0
      i6 = call @fn, @obj, %0 # 2
      i7 = ret i6 # 2
  */}, function() {
    fn.call(obj);
  });

  test('if/else', function() {/*
    block B0 -> B1, B2
      @a = literal %1 # 2
      i7 = branch @a # 4
    block B1 -> B3
       @b = literal %1 # 9
    block B2 -> B3
      @b = literal %2 # 13
    block B3
      t1 = literal %1
      t2 = literal %2
      t3 = binary %"+", @b, t1
      t4 = binary %"+", @b, t2
      i15 = ret t4
  */}, function() {
    a = 1;
    if (a) {
      b = 1;
    } else {
      b = 2;
    }
    b + 1;
    b + 2;
  });

  test('double if/else', function() {/*
    block B0 -> B1, B2
      @a = literal %1 # 2
      i1 = branch @a # 4
    block B1 -> B3
       @b = literal %1 # 9
    block B2 -> B3
      @b = literal %2 # 13
    block B3 -> B4
      t1 = literal %1
      t2 = literal %2
      t3 = binary %"+", @b, t1
      t4 = binary %"+", @b, t2
    block B4 -> B5, B6
      @a = literal %1 # 2
      i2 = branch @a # 4
    block B5 -> B7
       @b = literal %3 # 9
    block B6 -> B7
      @b = literal %4 # 13
    block B7
      t5 = literal %3
      t6 = literal %4
      t7 = binary %"+", @b, t5
      t8 = binary %"+", @b, t6
      ret t8
  */}, function() {
    a = 1;
    if (a) {
      b = 1;
    } else {
      b = 2;
    }
    b + 1;
    b + 2;
    a = 1;
    if (a) {
      b = 3;
    } else {
      b = 4;
    }
    b + 3;
    b + 4;
  });

  return;
  test('simple while loop', function() {/*
    block B0 -> B3
      @i = literal %undefined # 0
      @i = literal %0 # 2
    block B1 -> B3
    block B2 -> B6
    block B3 -> B4
    block B4 -> B5, B2
      i6 = literal %42 # 6
      i8 = binary %"<", @i, i6 # 4
      i9 = branch i8 # 3
    block B5 -> B1
      i12 = literal %1 # 10
      @i = binary %"+", @i, i12 # 8
    block B6
      i18 = ret @i # 0
  */}, function() {
  });
});
