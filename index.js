#!/usr/bin/env node
import axios from "axios";
const get = axios.get;
import {
  createWriteStream,
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from "fs";
import unzip from "decompress";
import { Stream } from "stream";
import { promisify } from "util";
import { spawn } from "child_process";
import enquirer from "enquirer";
import loading from "ora";
const prompt = enquirer.prompt;
import "colors";
import Template from "./templates.js";
import path from "path";
import licenses from "./licenses.js";

async function main() {
  const { action } = await prompt({
    type: "select",
    name: "action",
    message: "Select a template",
    choices: [
      {
        name: "basic",
        message: "Hello World",
      },
      {
        name: "discord.js",
        message: "Discord.JS v14",
      },
    ],
  });
  const template = Template.getByName(action);
  if (template == null) {
    console.log("Error: Template not found".red);
    return;
  }
  const { confirm } = await prompt({
    type: "confirm",
    name: "confirm",
    message: `Confirm template ${template.name}`,
    hint: "All files with same name will be overriden",
  });
  if (!confirm) {
    console.log("Aborted! ".yellow + "Have a nice day.".blue);
    return;
  }
  await installTemplate(template);
}

async function installTemplate(template) {
  const load = loading("Installing template...".blue).start();
  const os = await import("os");
  if (!existsSync("./package.json")) {
    load.text = "Initiating npm...";
    await runCommand("npm init -y");
  }
  load.stopAndPersist({ symbol: "" });
  const res = await prompt([
    {
      type: "input",
      name: "name",
      message: "Name",
      initial: path.basename(process.cwd()),
    },
    { type: "input", name: "description", message: "Description", initial: "" },
    {
      type: "input",
      name: "author",
      message: "Author",
      initial: os.userInfo().username,
    },
    { type: "input", name: "version", message: "Version", initial: "1.0.0" },
    { type: "input", name: "main", message: "Main file", initial: "index.js" },
    {
      type: "select",
      name: "license",
      message: "Select license",
      choices: [
        { name: "MIT", message: "MIT License" },
        { name: "ISC", message: "ISC License" },
      ],
    },
    { type: "confirm", name: "file", message: "Create LICENSE file?" },
  ]);
  await modifyPackage("name", res.name);
  await modifyPackage("description", res.description);
  await modifyPackage("author", res.author);
  await modifyPackage("version", res.version);
  await modifyPackage("main", res.main);
  await modifyPackage("license", res.license);
  if (res.file) {
    writeFileSync(
      "./LICENSE",
      licenses[res.license](new Date().getFullYear(), res.author)
    );
  }
  load.start();
  load.text = "Downloading template...";
  await downloadFile(template.url, "template.zip");
  load.text = "Unzipping file...";
  await unzipFile("template.zip");
  load.text = "Deleting template zip...";
  unlinkSync("template.zip");
  try {
    switch (template) {
      case Template.BASIC:
        load.text = "Modifying package.json";
        await modifyPackage("scripts", {
          start: "node .",
        });
        break;
      case Template.DISCORDJS:
        // modifying
        load.text = "Modifying package.json";
        await modifyPackage("scripts", {
          start: "node .",
          dev: "nodemon . --dev --ext js --signal SIGINT",
        });
        // - dependecies set
        await setDependencies(false, [
          { name: "colors", version: "1.4.0" },
          { name: "discord.js", version: "14.6.0" },
          { name: "fs", version: "0.0.1-security" },
        ]);
        await setDependencies(true, [{ name: "nodemon", version: "2.0.20" }]);
        await modifyPackage("type", "module");
        // install
        load.text = "Installing modules...";
        await runCommand("npm install");
        break;
    }
    load.succeed("Template installed".green);
  } catch (err) {
    load.fail(err.stack.red);
  }
}

/**
 *
 * @param {Boolean} dev
 * @param {{name: String, version: String}[]} array
 */
async function setDependencies(dev, array) {
  const object = {};
  for (const obj of array) {
    if (!obj.version.startsWith("^")) obj.version = "^" + obj.version;
    object[obj.name] = obj.version;
  }
  await modifyPackage(dev ? "devDependencies" : "dependencies", object);
}

async function modifyPackage(key, value) {
  let json = readFileSync("./package.json");
  let object = JSON.parse(json);
  object[key] = value;
  writeFileSync("./package.json", JSON.stringify(object, null, 4));
}

async function downloadFile(url, file) {
  const finishedDownload = promisify(Stream.finished);
  const writer = createWriteStream("./" + file);
  const response = await get(url, { responseType: "stream" }).catch((err) => {
    console.error(err.message);
  });
  response.data.pipe(writer);
  await finishedDownload(writer);
}

async function runCommand(command) {
  return await new Promise((resolve, reject) => {
    const cmd = command.split(" ")[0];
    const args = command.split(" ").slice(1);
    const child = spawn(cmd, args, { shell: true });
    child.on("exit", (code) => {
      resolve(code);
    });
    child.on("error", (err) => {
      reject(err);
    });
  });
}

async function unzipFile(file) {
  await unzip(file, ".");
}

main();
