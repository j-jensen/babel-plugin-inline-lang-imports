import tmp from 'tmp';
import path from 'path';
const x = "xx";
import { expect } from 'chai';
import { transform, transformFileSync } from 'babel-core';

tmp.setGracefulCleanup();

describe('babel-plugin-inline-lang-imports', () => {
  it('inlines simple LANG imports', () => {
    const t = configureTransform()
    const result = t(`
      import ress from '../test/fixtures/AccountPage.lang'
    `);

    expect(result.ast.program.body[0].type).to.equal("VariableDeclaration");
    expect(result.ast.program.body[0].declarations[0].id.name).to.equal("ress");

    expect(result.ast.program.body[0].declarations[0].init.type).to.equal("ObjectExpression");
    expect(result.ast.program.body[0].declarations[0].init.properties[0].key.name).to.equal("title");
    expect(result.ast.program.body[0].declarations[0].init.properties[1].value.value).to.equal("Avtaledokumenter");
  });

  it('supports destructuring of the LANG imports', () => {
    const t = configureTransform()
    const result = t(`
      import {linkBtnLabelBraVaenner as brvTxt} from '../test/fixtures/AccountPage.lang';
      console.log(brvTxt);
    `);

    // How th f... do we veryfy that?
    expect(result.ast.program.body[0].declarations[0].type).to.equal("VariableDeclarator");
  });

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
