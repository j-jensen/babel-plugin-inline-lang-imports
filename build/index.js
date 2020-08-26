'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = babelPluginInlineLangImports;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _decache = require('decache');

var _decache2 = _interopRequireDefault(_decache);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

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

            var json = requireModule(moduleName, state);
            var astNode = t.valueToNode(json);
            path.replaceWith(t.variableDeclaration('const', [t.variableDeclarator(leftExpression, astNode)]));
          }
        }
      },

      VariableDeclaration: {
        exit: function exit(path, state) {
          var node = path.node;


          var changed = false;
          var newDeclarators = node.declarations.map(function (declaration) {
            var init = declaration.init;


            if (init != null && init.type === 'CallExpression' && init.callee.type === 'Identifier' && init.callee.name === 'require' && init.arguments.length === 1 && init.arguments[0].type === 'StringLiteral' && init.arguments[0].value.match(SUPPORTED_MODULES_REGEX)) {
              changed = true;

              var json = requireModule(init.arguments[0].value, state);

              return t.variableDeclarator(declaration.id, t.valueToNode(json));
            } else {
              return declaration;
            }
          });

          if (changed) {
            path.replaceWith(t.variableDeclaration(node.kind, newDeclarators));
          }
        }
      }
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
    var key = types.identifier(specifier.imported.name);
    var value = types.identifier(specifier.local.name);

    return types.objectProperty(key, value);
  });

  return types.objectPattern(properties);
}

function requireModule(moduleName, state) {
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
  (0, _decache2.default)(filepath);

  return require(filepath);
}

function readJson(path) {
  var content = _fs2.default.readFileSync(require.resolve(path), "utf8");
  return JSON.parse(content);
}