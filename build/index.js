"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = babelPluginInlineLangImports;

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _langCore = require("lang-core");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var SUPPORTED_MODULES_REGEX = /\.lang$/;

function babelPluginInlineLangImports(_ref) {
  var t = _ref.types;

  return {
    visitor: {
      ImportDeclaration: {
        exit: function exit(path, state) {
          var node = path.node;


          var moduleName = node.source.value;
          if (moduleName.match(SUPPORTED_MODULES_REGEX)) {
            var leftExpression = determineLeftExpression(t, node);

            var json = requireLangModule(moduleName, state);
            var astNode = t.valueToNode(json);

            var properties = astNode.properties;

            astNode.properties = properties.map(function (prop) {
              var value = prop.value.value;

              var quasis = [];
              var expressions = [];
              var m = _langCore.templateRe.exec(value);
              var idx = 0;
              if (m !== null) {
                while (m !== null) {
                  // console.log(m);
                  quasis.push(t.templateElement({ raw: value.slice(idx, m.index) }, false));
                  idx = m.index + m[0].length;
                  expressions.push(t.identifier(m[1]));
                  m = _langCore.templateRe.exec(value);
                }
                quasis.push(t.templateElement({ raw: value.slice(idx) }, true));

                var afe = t.arrowFunctionExpression(expressions, t.templateLiteral(quasis, expressions));

                return Object.assign(prop, {
                  value: afe
                });
              }
              return prop;
            });

            path.replaceWith(t.variableDeclaration('const', [t.variableDeclarator(leftExpression, astNode)]));
          }
        }
      }
      /*
            VariableDeclaration: {
              exit(path, state) {
                const { node } = path
      
                let changed = false
                const newDeclarators = node.declarations.map(declaration => {
                  const { init } = declaration
      
                  if (
                    init != null &&
                    init.type === 'CallExpression' &&
                    init.callee.type === 'Identifier' &&
                    init.callee.name === 'require' &&
                    init.arguments.length === 1 &&
                    init.arguments[0].type === 'StringLiteral' &&
                    init.arguments[0].value.match(SUPPORTED_MODULES_REGEX)
                  ) {
                    changed = true
      
                    const json = requireLangModule(init.arguments[0].value, state);
                    console.log(declaration.id);
                    return t.variableDeclarator(
                      declaration.id,
                      t.valueToNode(json)
                    )
                  } else {
                    return declaration
                  }
                })
      
                if (changed) {
                  console.log(newDeclarators);
                  path.replaceWith(
                    t.variableDeclaration(node.kind, newDeclarators)
                  )
                }
              },
            },
            */
    }
  };
}

function determineLeftExpression(types, node) {
  if (isDestructuredImportExpression(node)) {
    return buildObjectPatternFromDestructuredImport(types, node);
  }

  var variableName = node.specifiers[0].local.name;

  return types.identifier(variableName);
}

function isDestructuredImportExpression(node) {
  return node.specifiers.length !== 1 || node.specifiers[0].type !== 'ImportDefaultSpecifier';
}

function buildObjectPatternFromDestructuredImport(types, node) {
  var properties = node.specifiers.map(function (specifier) {
    var key = specifier.imported.name,
        value = specifier.local.name;


    return types.objectProperty(types.identifier(key), types.identifier(value), false, key === value);
  });

  return types.objectPattern(properties);
}

function requireLangModule(moduleName, state) {
  var fileLocation = state.file.opts.filename;
  var filepath = null;

  if (fileLocation === 'unknown') {
    filepath = moduleName;
  } else {
    filepath = _path2.default.join(_path2.default.resolve(fileLocation), '..', moduleName);
  }

  return readJson(filepath);
}

function requireFresh(filepath) {
  decache(filepath);

  return require(filepath);
}

function readJson(path) {
  var content = _fs2.default.readFileSync(require.resolve(path), "utf8");
  return JSON.parse(content);
}