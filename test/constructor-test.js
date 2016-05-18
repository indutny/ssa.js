'use strict';

const assert = require('assert');
const assertText = require('assert-text');
assertText.options.trim = true;

const fixtures = require('./fixtures');
const cfgjs = require('../');

function test(fn, expected) {
  const pipelines = cfgjs.build(fixtures.parse(fn));
  const actual = pipelines.map((cfg) => {
    return cfg.render({ cfg: true }, 'printable');
  }).join('\n');

  assertText.equal(actual, expected);
}

describe('CFG.js/Constructor', () => {
  it('should create empty graph', () => {
    test(() => {
    }, `pipeline {
      b0 {
      }
    }`);
  });

  describe('literals', () => {
    it('should construct number', () => {
      test(() => {
        1;
        1.23;
        "hello";
      }, `pipeline {
        b0 {
          i0 = literal 1
          i1 = literal 1.23
          i2 = literal "hello"
        }
      }`);
    });
  });

  describe('global', () => {
    it('should construct global load', () => {
      test(() => {
        a;
      }, `pipeline {
        b0 {
          i0 = loadGlobal "a"
        }
      }`);
    });

    it('should construct global store', () => {
      test(() => {
        a = 1;
      }, `pipeline {
        b0 {
          i0 = literal 1
          i1 = storeGlobal "a", i0
        }
      }`);
    });
  });

  describe('property', () => {
    it('should construct named property load', () => {
      test(() => {
        a.b;
      }, `pipeline {
        b0 {
          i0 = loadGlobal "a"
          i1 = loadNamedProperty "b", i0
        }
      }`);
    });

    it('should construct named property store', () => {
      test(() => {
        a.b = 1;
      }, `pipeline {
        b0 {
          i0 = loadGlobal "a"
          i1 = literal 1
          i2 = storeNamedProperty "b", i0, i1
        }
      }`);
    });

    it('should construct property load', () => {
      test(() => {
        a['b'];
      }, `pipeline {
        b0 {
          i0 = loadGlobal "a"
          i1 = literal "b"
          i2 = loadProperty i0, i1
        }
      }`);
    });

    it('should construct property store', () => {
      test(() => {
        a['b'] = 1;
      }, `pipeline {
        b0 {
          i0 = loadGlobal "a"
          i1 = literal "b"
          i2 = literal 1
          i3 = storeProperty i0, i1, i2
        }
      }`);
    });
  });

  describe('es5 scope', () => {
    it('should construct empty variable declaration', () => {
      test(() => {
        var a;
      }, `pipeline {
        b0 {
          i0 = loadGlobal "undefined"
          i1 = ssa:store "a", i0
        }
      }`);
    });

    it('should construct variable declaration', () => {
      test(() => {
        var a = 1;
      }, `pipeline {
        b0 {
          i0 = literal 1
          i1 = ssa:store "a", i0
        }
      }`);
    });

    it('should construct local assignment', () => {
      test(() => {
        var a = 0;

        a = 1;
      }, `pipeline {
        b0 {
          i0 = literal 0
          i1 = ssa:store "a", i0
          i2 = literal 1
          i3 = ssa:store "a", i2
        }
      }`);
    });

    it('should construct local assignment in a block', () => {
      test(() => {
        var a = 0;

        {
          a = 1;
        }
      }, `pipeline {
        b0 {
          i0 = literal 0
          i1 = ssa:store "a", i0
          i2 = literal 1
          i3 = ssa:store "a", i2
        }
      }`);
    });

    it('should construct local load', () => {
      test(() => {
        var a = 0;

        a;
      }, `pipeline {
        b0 {
          i0 = literal 0
          i1 = ssa:store "a", i0
          i2 = ssa:load "a"
        }
      }`);
    });
  });

  describe('es6 scope', () => {
    it('should lookup const variables', () => {
      test(() => {
        const a = 1;

        {
          const a = 2;
          a;
        }

        a;
      }, `pipeline {
        b0 {
          i0 = literal 1
          i1 = ssa:store "a", i0
          i2 = literal 2
          i3 = ssa:store "1/a", i2
          i4 = ssa:load "1/a"
          i5 = ssa:load "a"
        }
      }`);
    });

    it('should modify let variables', () => {
      test(() => {
        let a = 1;

        {
          let a = 2;
          a = 3;
        }

        a = 4;
      }, `pipeline {
        b0 {
          i0 = literal 1
          i1 = ssa:store "a", i0
          i2 = literal 2
          i3 = ssa:store "1/a", i2
          i4 = literal 3
          i5 = ssa:store "1/a", i4
          i6 = literal 4
          i7 = ssa:store "a", i6
        }
      }`);
    });
  });
});
