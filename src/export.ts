import { exec } from 'child_process';
import { access, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { Notice, TFile } from 'obsidian';
import { convertToBase64 } from './convertImage';
import { join, normalize } from 'path';
import fixPath from 'fix-path';
import { getEngine } from './engine';
import { marpConfig } from './marp';

const imgPathReg = /!\[[^\]]*\]\(([^)]+)\)/g;

export async function exportSlide(
  file: TFile,
  ext: 'html' | 'pdf' | 'pptx',
  basePath: string,
  themeDir: string,
) {
  const exportDir = join(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME']!,
    'Downloads',
  );
  if (!file) return;
  const filePath = normalize(join(basePath, file.path));
  const tmpPath = join(exportDir, `${file.basename}.tmp`);
  const tmpEnginePath = join(exportDir, 'engine.js');
  const tmpconfigPath = join(exportDir, 'package-marp.json');

  let fileContent = await readFile(filePath, 'utf-8');

  const srcBase64TupleList = await Promise.all(
    [...new Set([...fileContent.matchAll(imgPathReg)].map(v => v[1]))].map(
      async v => [v, await convertToBase64(v)] as const,
    ),
  );

  for (const [src, base64] of srcBase64TupleList) {
    fileContent = fileContent.replace(
      new RegExp(
        String.raw`(!\[[^\]]*\])\(${src.replace(/\\/g, '\\\\')}\)`,
        'g',
      ),
      `$1(${base64})`,
    );
  }

  await mkdir(exportDir, { recursive: true });
  try {
    await writeFile(tmpPath, fileContent);
    await writeFile(tmpEnginePath, getEngine());
    await writeFile(tmpconfigPath, JSON.stringify({options:marpConfig}));

  } catch (e) {
    console.error(e);
  }


  let cmd: string;
  try {
    await access(themeDir);
    cmd = `npx -y @marp-team/marp-cli@latest  --bespoke.transition --stdin false --allow-local-files --theme-set "${themeDir}" -o "${join(
      exportDir,
      file.basename,
    )}.${ext}" --engine ${tmpEnginePath}  --config ${tmpconfigPath} -- "${tmpPath}"`;
  } catch {
    cmd = `npx -y @marp-team/marp-cli@latest --stdin false --allow-local-files --bespoke.transition -o "${join(
      exportDir,
      file.basename,
    )}.${ext}" --engine ${tmpEnginePath}  --config ${tmpconfigPath} -- "${tmpPath}"`;
  }

  fixPath();
  new Notice(`Exporting "${file.basename}.${ext}" to "${exportDir}"`, 20000);
  exec(cmd, () => {
    new Notice('Exported successfully', 20000);
    rm(tmpPath);
    rm(tmpEnginePath);
    rm(tmpconfigPath);
  });
}

//npx -y @marp-team/marp-cli@latest  --bespoke.transition --stdin false --allow-local-files --theme-set "${themeDir}" -o "Téléchargements/test.html" --engine ${tmpEnginePath} -- "${tmpPath}  -config ${tmpconfigPath}
