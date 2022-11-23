class Template {
  static DISCORDJS = new Template(
    "discord.js",
    "https://github.com/Mimexe/MimeTemplates-templates/raw/main/discordjs.zip"
  );
  static BASIC = new Template(
    "basic",
    "https://github.com/Mimexe/MimeTemplates-templates/raw/main/basic.zip"
  );

  /**
   *
   * @param {String} name
   * @returns {Template|null}
   */
  static getByName(name) {
    for (const variable in Template) {
      const template = Template[variable];
      if (template.name === name) {
        return template;
      }
    }
    return null;
  }

  /**
   *
   * @param {String} name
   * @param {String} url
   */
  constructor(name, url) {
    this.name = name;
    this.url = url;
  }
}

export default Template;
