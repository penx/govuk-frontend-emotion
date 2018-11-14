const sassExtract = require('sass-extract');

const { existsSync, mkdirSync, lstatSync, readdirSync, writeFileSync } = require('fs')
const { join, parse } = require('path')
const { convertCssForEmotion } = require('@penx/css-in-js-generator/lib/convertCssForEmotion');
const { format } = require('prettier');


// https://stackoverflow.com/questions/18112204/get-all-directories-within-directory-nodejs
const isDirectory = source => lstatSync(source).isDirectory()
const getDirectories = source =>
  readdirSync(source).map(name => join(source, name)).filter(isDirectory)

const componentDirs = getDirectories('./node_modules/govuk-frontend/components/');

const mkdir = dir => {
  if (!existsSync(dir)){
    mkdirSync(dir);
  }
}

mkdir('./es')
mkdir('./es/components')
mkdir('./lib')
mkdir('./lib/css')
mkdir('./lib/json')


componentDirs.map(componentDir => {
  const componentName = parse(componentDir).name;
  console.log(`building: ${componentName}`);

  sassExtract.render({
    file: `./node_modules/govuk-frontend/components/${componentName}/_${componentName}.scss`
  })
  .then(rendered => {
    let emotion = convertCssForEmotion(rendered.css.toString());
    // remove all calls to injectGlobal
    emotion = emotion.replace(/injectGlobal`([^`])+`;/, '');
    emotion = format(
        emotion.replace(
            /^injectGlobal/m,
            "css",
        ),
        {
            parser: "typescript",
            tabWidth: 4,
        },
    ).replace(/^css/m, "injectGlobal");

    writeFileSync(`./es/components/${componentName}.js`, emotion);
    writeFileSync(`./lib/json/${componentName}.json`, JSON.stringify(rendered.vars, null, 2));
    writeFileSync(`./lib/css/${componentName}.css`, rendered.css.toString());
    console.log(`done: ${componentName}`);
  });
})

const componentNames = componentDirs.map(componentDir => parse(componentDir).name);

const indexFile = componentNames.map(name => `export * from './components/${name}';`).join('\n');

writeFileSync('./es/index.js', indexFile);
