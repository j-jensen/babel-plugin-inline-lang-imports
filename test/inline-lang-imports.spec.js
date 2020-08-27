import path from 'path';
import assert from "assert";
import { transform, transformFileSync } from 'babel-core';
import * as t from "babel-types";

describe('babel-plugin-inline-lang-imports', () => {
  it('inlines simple LANG imports', () => {
    const execTransform = configureTransform()
    const result = execTransform(`
      import ress from '../test/fixtures/AccountPage.lang';
    `);

    const { ast: { program: { body: [{ declarations: [{ id, init }] }] } } } = result;

    assert.ok(t.isObjectExpression(init));
    assert.ok(t.isIdentifier(id, { name: "ress" }));

    const { properties: langProps } = init;

    assert.ok(langProps.every(p => t.isObjectProperty(p)));

    const [{ key: { name } }, { value: { value } }] = langProps;

    assert.equal(name, "title");
    assert.equal(value, "Avtaledokumenter");
  });

  it('supports aliased-destructuring of the LANG imports', () => {
    const execTransform = configureTransform()
    const result = execTransform(`
        import {linkBtnLabelBraVaenner as brvTxt} from '../test/fixtures/AccountPage.lang';
        console.log(brvTxt);
      `);

    const { ast: { program: { body: [{ declarations: [declaration] }] } } } = result;

    assert.ok(t.isVariableDeclarator(declaration));

    const { id: { properties: [obj] } } = declaration;
    assert.ok(t.isObjectProperty(obj));
    assert.equal(obj.shorthand, false, "Aliased destruction, can not be shorthand");
  });

  it('supports destructuring of the LANG imports', () => {
    const execTransform = configureTransform()
    const result = execTransform(`
      import {linkBtnLabelBraVaenner} from '../test/fixtures/AccountPage.lang';
      console.log(linkBtnLabelBraVaenner);
    `);

    const { ast: { program: { body: [{ declarations: [declaration] }] } } } = result;

    assert.ok(t.isVariableDeclarator(declaration));

    const { id: { properties: [obj] } } = declaration;
    assert.ok(t.isObjectProperty(obj));
    assert.ok(obj.shorthand);
  });

  it('Supports template props', () => {
    const execTransform = configureTransform()
    let res = null;
    const result = execTransform(`
      import {merchanttip} from '../test/fixtures/commonReducer.lang';
      res = merchanttip('Hello world', 2020);
    `);
    const { ast: { program: { body: [{ declarations: [declaration] }] } } } = result;

    // TODO: Unittest to verify this
    eval(result.code);
    assert.ok(res);

    //console.log("Test", declaration.init.properties);
  })
});

function configureTransform(options = {}, isFile) {
  return function configuredTransform(string) {
    const transformOptions = {
      babelrc: false,
      presets: [],
      plugins: [[path.resolve('./src'), options]], // Be sure to use our plugin - SUT
    }

    if (isFile) {
      return transformFileSync(string, transformOptions)
    } else {
      return transform(string.trim(), transformOptions)
    }
  }
}
