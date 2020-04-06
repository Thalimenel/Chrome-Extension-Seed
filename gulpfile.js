const { series, parallel, src, dest } = require('gulp');
const path = require("path");
const util = require('util');
const glob = require("glob");
const fs = require("fs");
const fsPromises = fs.promises;
const AdmZip = require('adm-zip');
const zip = require('gulp-zip');


const promiseGlob = util.promisify(glob);
const exec = util.promisify(require('child_process').exec);

const logError = msg => console.log(`[\x1b[38;5;240m${(new Date).toTimeString().split(' ')[0]}\x1b[0m] \x1b[31m\x1b[1m%s\x1b[0m`, msg);

const sourceFolder = 'src';
const destinationFolder = 'build';
const packageFolder = 'package';
const packageFileName = 'package.zip';

const clean = folder => async () => {
    let globs = await promiseGlob(`${folder}/**/*.*`);
    for (let i = 0, length = globs.length; i < length; i++) {
        await fsPromises.unlink(globs[i]);
    }
    await fsPromises.rmdir(folder, { recursive: true });
}

const cleanBuild = clean(destinationFolder);
cleanBuild.displayName = 'Clean Build Folder'

const cleanPackage = clean(packageFolder);
cleanPackage.displayName = 'Clean Package Folder'

const buildTS = async () => {
    return exec('tsc');
}
buildTS.displayName = 'Build TypeScript'

function copyNonCode() {
    return src(`${sourceFolder}/**/!(*.ts|*.js)`)
        .pipe(dest(`${destinationFolder}`));
}
copyNonCode.displayName = 'Copying Non TS files';

const checkManifest = async () => {
    let packageFile = `${__dirname}${path.sep}${packageFolder}${path.sep}${packageFileName}`;
    if (fs.existsSync(packageFile)) {
        let zip = new AdmZip(packageFile);
        let manifest = JSON.parse(zip.readAsText("manifest.json"));
        let oldVersion = manifest.version;
        let realManifest = await fsPromises.readFile(`${sourceFolder}${path.sep}manifest.json`, { encoding: 'utf8' });
        let newVersion = JSON.parse(realManifest).version;
        if (newVersion == oldVersion) {
            logError('Error: Change Manifest Version');
        }
    }
    else {
        return;
    }
}
checkManifest.displayName = 'Check Manifest Vesrion';

function zipPackage() {
    return src(`${destinationFolder}/**/*`)
        .pipe(zip(packageFileName))
        .pipe(dest(packageFolder))
}
zipPackage.displayName = 'Zipping'


const build = series(cleanBuild, parallel(copyNonCode, buildTS));
const pack = series(checkManifest, parallel(cleanPackage, build), zipPackage);

exports.default = build;
exports.build = build;
exports.pack = pack;