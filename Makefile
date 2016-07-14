BABEL := node_modules/.bin/babel
SCRIPTS := $(shell find src bench -name '*.js*')

all: javascript documentation package.json

javascript: $(SCRIPTS)
	@ $(BABEL) -q -s inline -d tmp $^
	@ rsync -uraq tmp/src/ dist/
	@ echo "Compiled $(words $^) modules."

documentation: *.md docs
	@ rsync -uraq $^ dist/

package.json:
	@ node -p 'p=require("./package");p.main="microcosm.js";p.private=undefined;p.scripts=p.devDependencies=undefined;JSON.stringify(p,null,2)' > dist/package.json

release: clean all
	npm publish dist

prerelease: clean all
	npm publish dist --tag beta

bench: javascript
	@ node --expose-gc tmp/bench/tree-performance
	@ node --expose-gc tmp/bench/dispatch-performance
	@ node --expose-gc tmp/bench/push-performance

clean:
	@ rm -rf {tmp,dist}

.PHONY: all clean bench package.json documentation release prerelease
