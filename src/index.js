import Path from 'path'
import fs from "fs";

const templateRe = /\$\{(\w+):?(\w+)?\}/g;
const typedescRe = /(\${\w+)(:\w+)(})/g;


const SUPPORTED_MODULES_REGEX = /\.lang$/

export default function babelPluginInlineLangImports({ types: t }) {
  return {
    visitor: {
      ImportDeclaration: {
        exit(path, state) {
          const { node } = path

          const moduleName = node.source.value;
          if (moduleName.match(SUPPORTED_MODULES_REGEX)) {
            const leftExpression = determineLeftExpression(t, node);

            const json = requireLangModule(moduleName, state);
            let astNode = t.valueToNode(json);

            const { properties } = astNode;
            astNode.properties = properties.map((prop) => {
              const { value: { value } } = prop;
              const quasis = [];
              const expressions = [];
              let m = templateRe.exec(value);
              let idx = 0;
              if (m !== null) {
                while (m !== null) {
                  // console.log(m);
                  quasis.push(t.templateElement({ raw: value.slice(idx, m.index) }, false));
                  idx = m.index + m[0].length
                  expressions.push(t.identifier(m[1]));
                  m = templateRe.exec(value);
                }
                quasis.push(t.templateElement({ raw: value.slice(idx) }, true));

                const afe = t.arrowFunctionExpression(
                  expressions,
                  t.templateLiteral(
                    quasis,
                    expressions
                  )
                );
  
                return Object.assign(prop, {
                  value: afe
                });
              }
              return prop;
            });

            path.replaceWith(
              t.variableDeclaration('const', [
                t.variableDeclarator(
                  leftExpression,
                  astNode
                ),
              ])
            )
          }
        },
      },
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
    const { imported: { name: key }, local: { name: value } } = specifier;

    return types.objectProperty(types.identifier(key), types.identifier(value), false, key === value);
  })

  return types.objectPattern(properties)
}

function requireLangModule(moduleName, state) {
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
