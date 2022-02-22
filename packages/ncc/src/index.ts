#!/usr/bin/env node
import minimist from 'minimist';
import path from 'path';
import fs from 'fs-extra';
import { BuildArgs, build } from 'kkt';
import { overridePaths } from 'kkt/lib/overrides/paths';
import { sync as gzipSize } from 'gzip-size';
import filesize from 'filesize';
import pkg from '../package.json';
import './overrides';
import { filterPlugins, removeLoaders } from './utils';

function help() {
  console.log('\n  Usage: \x1b[34;1mncc\x1b[0m [build] [input-file] [--help|h]');
  console.log('\n  Displays help information.');
  console.log('\n  Options:\n');
  console.log('   --version, -v        ', 'Show version number');
  console.log('   --help, -h           ', 'Displays help information.');
  console.log('   -o, --out [dir]      ', 'Output directory for build (defaults to \x1b[35mdist\x1b[0m).');
  console.log('   -m, --minify         ', 'Minify output.');
  console.log('   -s, --source-map     ', 'Generate source map.');
  console.log('   -e, --external [mod] ', "Skip bundling 'mod'. Can be used many times.");
  console.log('\n  Example:\n');
  console.log('   $ \x1b[35mncc\x1b[0m build');
  console.log('   $ \x1b[35mncc\x1b[0m build --out ./dist');
  console.log('   $ \x1b[35mncc\x1b[0m build --minify');
  console.log('   $ \x1b[35mncc\x1b[0m build src/app.ts');
  console.log(`   $ \x1b[35mncc\x1b[0m build --source-map`);
  console.log(`\n  \x1b[34;1m@kkt/ncc\x1b[0m \x1b[32;1mv${pkg.version || ''}\x1b[0m\n`);
}

interface NCCArgs extends BuildArgs {
  out?: string;
  target?: string;
  minify?: boolean;
  sourceMap?: boolean;
}

const data = {
  nolog: false,
  minify: false,
  file: '',
  min: '',
  minFilePath: '',
  filePath: '',
  mapFile: '',
  mapMinFile: '',
  mapMinFilePath: '',
  mapFilePath: '',
};

process.on('beforeExit', () => {
  if (data.nolog) {
    return;
  }
  if (fs.existsSync(data.minFilePath)) {
    data.min = fs.readFileSync(data.minFilePath).toString();
  }
  if (fs.existsSync(data.filePath)) {
    data.file = fs.readFileSync(data.filePath).toString();
  }
  if (fs.existsSync(data.mapMinFilePath)) {
    data.mapMinFile = fs.readFileSync(data.mapMinFilePath).toString();
  }
  if (fs.existsSync(data.mapFilePath)) {
    data.mapFile = fs.readFileSync(data.mapFilePath).toString();
  }
});

process.on('exit', (code) => {
  if (code === 1 || data.nolog) {
    return;
  }
  const outputDir = path.relative(process.cwd(), path.dirname(data.filePath));
  if (!!data.file) {
    fs.writeFileSync(data.filePath, data.file);
    !data.minify &&
      console.log(
        `   ${filesize(gzipSize(data.file))}  \x1b[30;1m${outputDir}/\x1b[0m\x1b[32m${path.basename(
          data.filePath,
        )}\x1b[0m.`,
      );
  }
  if (!!data.min) {
    fs.writeFileSync(data.minFilePath, data.min);
    data.minify &&
      console.log(
        `   ${filesize(gzipSize(data.min))}  \x1b[30;1m${outputDir}/\x1b[0m\x1b[32m${path.basename(
          data.minFilePath,
        )}\x1b[0m.`,
      );
  }
  if (!!data.mapMinFile) {
    fs.writeFileSync(data.mapMinFilePath, data.mapMinFile);
  }
  if (!!data.mapFile) {
    fs.writeFileSync(data.mapFilePath, data.mapFile);
  }
  console.log(`\n\nOutput Dir: \x1b[32m${outputDir}\x1b[0m.\n`);
});

(async () => {
  try {
    const args = process.argv.slice(2);
    const argvs: NCCArgs = minimist(args);
    if (argvs.h || argvs.help) {
      data.nolog = true;
      return help();
    }
    if (argvs.v || argvs.version) {
      data.nolog = true;
      console.log(`\n \x1b[34;1m@kkt/ncc\x1b[0m \x1b[32;1mv${pkg.version || ''}\x1b[0m\n`);
      return;
    }

    argvs.out = argvs.o = path.resolve(argvs.out || argvs.o || 'dist');
    argvs.minify = argvs.m = argvs.minify || argvs.m || false;

    const scriptName = argvs._[0];
    const inputFile = path.resolve(argvs._[1] || 'src/index.ts');

    if (!fs.existsSync(inputFile)) {
      throw Error(`KKT:NCC: Example "build <input-file> [opts]".`);
    }

    const fileName = path.basename(inputFile).replace(/.(js|jsx?|mjs|tsx?)/, '');
    const outDir = argvs.out;

    data.minFilePath = path.resolve(argvs.out, `${fileName}.min.js`);
    data.filePath = path.resolve(argvs.out, `${fileName}.js`);
    data.mapFilePath = path.resolve(argvs.out, `${fileName}.min.js.map`);
    data.mapMinFilePath = path.resolve(argvs.out, `${fileName}.js.map`);

    if (fs.existsSync(data.minFilePath)) {
      data.min = fs.readFileSync(data.minFilePath).toString();
    }
    if (fs.existsSync(data.filePath)) {
      data.file = fs.readFileSync(data.filePath).toString();
    }
    if (fs.existsSync(data.mapFilePath)) {
      data.mapFile = fs.readFileSync(data.mapFilePath).toString();
    }
    if (fs.existsSync(data.mapMinFilePath)) {
      data.mapMinFilePath = fs.readFileSync(data.mapMinFilePath).toString();
    }

    const oPaths = { appBuild: outDir, appIndexJs: inputFile };

    fs.ensureDirSync(outDir);
    overridePaths(undefined, { ...oPaths });
    argvs.overridesWebpack = (conf, env, options) => {
      overridePaths(undefined, { ...oPaths });
      conf = filterPlugins(conf, argvs.minify, fileName);
      conf = removeLoaders(conf);
      conf.entry = inputFile;
      if (argvs.sourceMap) {
        conf.devtool = 'source-map';
      }
      conf.amd = false;
      conf.target = argvs.target ? ['node14', argvs.target] : 'node14';
      conf.mode = env === 'development' ? 'development' : 'production';
      conf.output = {};
      if (conf.output) {
        conf.output.libraryTarget = 'commonjs';
        conf.output.path = outDir;
        conf.output.filename = `${fileName}${argvs.minify ? '.min.js' : '.js'}`;
      }
      return conf;
    };
    if (scriptName === 'build') {
      await build({
        ...argvs,
        bundle: true,
        isNotCheckHTML: true,
        overridePaths: { ...oPaths },
      });
    }
    data.minify = argvs.minify;
  } catch (error) {
    console.log('\x1b[31m KKT:NCC:ERROR:\x1b[0m', error);
  }
})();
