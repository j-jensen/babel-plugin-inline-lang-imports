import Path from 'path'
import decache from 'decache';
import fs from "fs";

const SUPPORTED_MODULES_REGEX = /\.lang$/

export default function babelPluginInlineLangImports({ types: t }) {
  return {
    visitor: {
      ImportDeclaration: {
        exit(path, state) {
          const { node } = path

          const moduleName = node.source.value

          if (moduleName.match(SUPPORTED_MODULES_REGEX)) {
            const leftExpression = determineLeftExpression(t, node)

            const json = requireModule(moduleName, state);
            const astNode = t.valueToNode(json);
            path.replaceWith(
              t.variableDeclaration('const', [
                t.variableDeclarator(
                  leftExpression,
                  astNode,
                ),
              ])
            )
          }
        },
      },

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

              const json = requireModule(init.arguments[0].value, state)

              return t.variableDeclarator(
                declaration.id,
                t.valueToNode(json)
              )
            } else {
              return declaration
            }
          })

          if (changed) {
            path.replaceWith(
              t.variableDeclaration(node.kind, newDeclarators)
            )
          }
        },
      },
    },
  }
}

function determineLeftExpression(types, node) {
  if (isDestructuredImportExpression(node)) {
    return buildObjectPatternFromDestructuredImport(types, node)
  }

  const variableName = node.specifiers[0].local.name

  return types.identifier(variableName)
}

function isDestructuredImportExpression(node) {
  return node.specifiers.length !== 1 ||
    node.specifiers[0].type !== 'ImportDefaultSpecifier'
}

function buildObjectPatternFromDestructuredImport(types, node) {
  const properties = node.specifiers.map((specifier) => {
    const key = types.identifier(specifier.imported.name)
    const value = types.identifier(specifier.local.name)

    return types.objectProperty(key, value)
  })

  return types.objectPattern(properties)
}

function requireModule(moduleName, state) {
  const fileLocation = state.file.opts.filename
  let filepath = null

  if (fileLocation === 'unknown') {
    filepath = moduleName
  } else {
    filepath = Path.join(Path.resolve(fileLocation), '..', moduleName)
  }

  return readJson(filepath)
}

function requireFresh(filepath) {
  decache(filepath)

  return require(filepath)
}

function readJson(path) {
  const content = fs.readFileSync(require.resolve(path), "utf8");
  return JSON.parse(content);
}