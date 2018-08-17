const sassExtract = require('sass-extract');

const { lstatSync, readdirSync, writeFileSync } = require('fs')
const { join, parse } = require('path')
const { convertCssForEmotion } = require('css-in-js-generator/lib/convertCssForEmotion');
const { format } = require('prettier');


// https://stackoverflow.com/questions/18112204/get-all-directories-within-directory-nodejs
const isDirectory = source => lstatSync(source).isDirectory()
const getDirectories = source =>
  readdirSync(source).map(name => join(source, name)).filter(isDirectory)

const componentDirs = getDirectories('./node_modules/govuk-frontend/components/');

componentDirs.map(componentDir => {
  const componentName = parse(componentDir).name;
  console.warn(componentName);

  sassExtract.render({
    file: `./node_modules/govuk-frontend/components/${componentName}/_${componentName}.scss`
  })
  .then(rendered => {
    console.log(rendered.vars);
    console.log(rendered.css.toString());
    let emotion = convertCssForEmotion(rendered.css.toString());
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

    console.log(emotion);

    writeFileSync(`./es/components/${componentName}.js`, emotion);
    writeFileSync(`./bin/${componentName}.json`, JSON.stringify(rendered.vars, null, 2));
    writeFileSync(`./bin/${componentName}.css`, rendered.css.toString());
  });
})

const componentNames = componentDirs.map(componentDir => parse(componentDir).name);

const indexFile = componentNames.map(name => `export * from './components/${name}';`).join('\n');

writeFileSync('./es/index.js', indexFile);
