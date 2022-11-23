#!/usr/bin/env node
import axios from "axios";
const get = axios.get;
import { createWriteStream, unlinkSync } from "fs";
import unzip from "decompress";
import { Stream } from "stream";
import { promisify } from "util";
import { spawn } from "child_process";
import enquirer from "enquirer";
import loading from "ora";
const prompt = enquirer.prompt;
import "colors";
import Template from "./templates.js";

async function main() {
  const { action } = await prompt({
    type: "select",
    name: "action",
    message: "Select a template",
    choices: [
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
  try {
    switch (template) {
      case Template.DISCORDJS:
        load.text = "Downloading template...";
        await downloadFile(Template.DISCORDJS.url, "template.zip");
        load.text = "Unzipping file...";
        await unzipFile("template.zip", load);
        load.text = "Installing modules...";
        await runCommand("npm install");
        load.text = "Deleting template zip...";
        unlinkSync("template.zip");
    }
    load.succeed("Template installed".green);
  } catch (err) {
    load.fail(err.stack.red);
  }
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

async function unzipFile(file, load) {
  await unzip(file, ".", {
    map: (file) => {
      load.text = file.path;
      return file;
    },
  });
}

main();
