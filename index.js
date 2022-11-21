#!/usr/bin/env node
const axios = require("axios");
const fs = require("fs");
const fsExtra = require("fs-extra");
const { prompt } = require("enquirer");
const unzip = require("decompress");
const { Stream } = require("stream");
const { promisify } = require("util");
const cp = require("child_process");
const path = require("path");
require("colors");
async function main() {
  const files = fs.readdirSync(".");
  if (!process.argv.includes("--force")) {
    if (files.length > 0) {
      console.log("Files in directory ! Confirm please".red);
      const { confirm } = await prompt({
        name: "confirm",
        type: "confirm",
        message: "Confirm",
      });
      if (confirm) {
        console.log("Confirmed".red);
      } else {
        console.log("Aborted".yellow);
        return;
      }
    }
  } else {
    console.log("Recommended protections disabled".yellow);
    if (process.argv.includes("--delete")) {
      console.log("Delete flag ! Confirm please".red);
      const { confirm } = await prompt({
        name: "confirm",
        type: "confirm",
        message: "Confirm",
      });
      if (confirm) {
        await fsExtra.emptyDir(".");
        console.log("Deleted".red);
      } else {
        console.log("Aborted".yellow);
        return;
      }
    }
  }
  const action = await askAction();
  if (action == "init") {
    await init();
    console.log("Template initiated".green);
    const res = await askAdd();
    await add(res);
    console.log("Template added".green);
  } else if (action == "add") {
    if (fs.existsSync("./package.json")) {
      const res = await askAdd();
      await add(res);
      console.log("Template added".green);
    } else {
      console.log(
        "Please create package json using 'ninit' or select 'Init and Add Template'"
          .red
      );
    }
  }
}

async function askAdd() {
  const { action } = await prompt([
    {
      name: "action",
      message: "Select an type",
      type: "select",
      choices: [
        { name: "discordjs", value: "discordjs", message: "Discord.js" },
      ],
    },
  ]);
  return action;
}

async function init() {
  return await new Promise(async (resolve) => {
    await downloadInitFile("./init.bat");
    const child = cp.spawn("init.bat");
    child.on("exit", () => {
      fs.unlinkSync("./init.bat");
      resolve();
    });

    child.stdout.on("data", (data) => {
      if (data.toString().includes(">")) {
        console.log("Started STDIN, write the git remote".green);
        process.stdin.resume();
        process.stdin.once("data", (dat) => {
          child.stdin.write(`${dat.toString()}\n`);
          process.stdin.pause();
          console.log("Done!".yellow);
        });
      }
    });

    child.stdout.on("data", (data) => {
      process.stdout.write(`[INIT FILE] ${data.toString()}`.blue);
    });
    child.stderr.on("data", (data) => {
      console.log(`[INIT FILE] ${data.toString()}`.red);
    });
  });
}

async function add(type) {
  switch (type) {
    case "discordjs":
      await downloadDiscordJSTemplate("./template.zip");
      console.log(`Downloaded!`.green);
      await unzipFile("template.zip", ".");
      console.log(`Unzipped!`.green);
      fs.unlinkSync("template.zip");
      await installModules("discord.js path fs colors");
      console.log(`Modules installed!`.green);
      const { token } = await prompt([
        {
          name: "token",
          message: "Insert your discord bot token",
          type: "input",
        },
      ]);
      fs.writeFileSync(
        "./config.js",
        `module.exports = {\n   token: "${token}"\n};`
      );
      break;
  }
}

async function installModules(modules) {
  return await new Promise((resolve) => {
    fs.writeFileSync(
      "./install.bat",
      "npm install " + modules.split(" ").join(" ")
    );
    const child = cp.spawn("install.bat");

    child.on("exit", (code) => {
      fs.unlinkSync("./install.bat");
      resolve();
    });

    child.stderr.on("data", (data) => {
      console.log(`[NPM INSTALL] [STDERR] ${data.toString()}`.red);
    });
  });
}

async function downloadInitFile(out) {
  const finishedDownload = promisify(Stream.finished);
  const writer = fs.createWriteStream(out);
  const response = await axios
    .get("https://raw.githubusercontent.com/Mimexe/Mimexe/main/ninit.cmd", {
      responseType: "stream",
    })
    .catch((err) => {
      console.error(err.message);
    });
  response.data.pipe(writer);
  await finishedDownload(writer);
}

async function askAction() {
  const { action } = await prompt([
    {
      name: "action",
      message: "Select an action",
      type: "select",
      choices: [
        { name: "init", value: "init", message: "Init and Add Template" },
        { name: "add", value: "add", message: "Add Template" },
      ],
    },
  ]);
  return action;
}

async function downloadDiscordJSTemplate(out) {
  const finishedDownload = promisify(Stream.finished);
  const writer = fs.createWriteStream(out);
  const response = await axios
    .get(
      "https://github.com/Mimexe/Templator-templates/raw/main/discordjs.zip",
      { responseType: "stream" }
    )
    .catch((err) => {
      console.error(err.message);
    });
  response.data.pipe(writer);
  await finishedDownload(writer);
}

async function unzipFile(file, folder) {
  await unzip(file, folder);
}

main();
