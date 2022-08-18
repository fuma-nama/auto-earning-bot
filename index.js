require("dotenv").config();
const { Client } = require("discord.js-selfbot-v13");
const client = new Client({
  checkUpdate: false,
}); // All partials are loaded automatically

const guild = "859988837089148938";
const channel = "1009475143711600742";

const actions = [
  "整理道路",
  "種田",
  "幫葵找到星座",
  "煮飯",
  "拖地",
  "鋪床",
  "維修車子",
  "打掃小屋",
  "裝水",
  "簽到",
  "陪伴葵看星星",
].map((action) => ({
  text: action,
  cd: null,
}));

client.on("ready", async () => {
  console.log(`${client.user.username} is ready!`);
  console.log(`Listening on Guild[${guild}] in Channel[${channel}]`);

  dumpCD();
});

client.on("messageCreate", async (event) => {
  if (event.guildId !== guild || event.channelId !== channel) return;
  if (!event.author.bot) return;

  const embed = event.embeds.find(
    (e) => e.author && e.author.name === client.user.tag
  );
  if (!embed) return;

  const field = embed.fields.find((f) => f.name === "Server Cooldowns");
  if (!field) return;

  console.log(`New Cooldowns ${field.value}`);

  const cooldowns = field.value.split("\n").map((v) => parseCoolDown(v));

  for (const { action: text, time } of cooldowns) {
    const action = actions.find((a) => a.text === text);
    if (!action) {
      console.log(`Unknown Action ${action}`);
      continue;
    }

    const now = new Date(Date.now());
    const cd = now.setSeconds(now.getSeconds() + time);

    console.log(`${action.text} ${cd}s`);
    action.cd = cd;
  }

  runActions();
});

client.login(process.env.TOKEN);

/**
 * Set all Actions CDs
 */
async function dumpCD() {
  const c = await client.channels.fetch(channel);

  await c.send(".cd");
}

async function runActions() {
  const waiting = actions.every((a) => a.cd > Date.now());

  if (waiting) {
    setTimeout(runActions, 100);
    return;
  }
  console.log(`Next execution: ${new Date(Date.now()).toLocaleTimeString()}`);

  const c = await client.channels.fetch(channel);

  for (const action of actions) {
    const cd = action.cd;

    console.log(`Cd: ${cd}s, Now: ${Date.now()}s`);
    if (cd && cd > Date.now()) continue;
    await c.send(action.text);
    //timeout
    await new Promise((r) => setTimeout(r, 5000));
  }

  await dumpCD();
}

/**
 * Example: `[AR] 打掃小屋` - 3 minutes
 * @param {string} line
 * @return {{action: string, time: number}}
 */
function parseCoolDown(line) {
  var [action, time] = line.split(" - ");

  action = action.substring("`[AR] ".length, action.length - "`".length);
  time = parseSeconds(time);

  return {
    action,
    time,
  };
}

/**
 *
 * @param {string} text
 * @return {number} seconds
 */
function parseSeconds(text) {
  if (text === "a few seconds") return 15; //no one knows how "a few seconds" long

  let [value, unit] = text.split(" ");

  if (value === "a") {
    value = 1;
  } else {
    value = parseInt(value);
  }

  switch (unit) {
    case "minute":
    case "minutes":
      value = value * 60;
      break;
    case "hour":
    case "hours":
      value = value * 60 * 60;
      break;
    case "day":
    case "days":
      value = value * 60 * 60 * 24;
      break;
  }

  return value;
}
