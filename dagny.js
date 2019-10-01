const bot_secret = require('./lib/bot-secret')
var bot = require('./lib/bot');

var emuji = require('./lib/emuji-functions');
const fs = require('fs')

const discord = require('discord.js')
const client = new discord.Client()

// const emuji = require("./emuji-functions")
const emujiUserID = "Emuji#8780"

// channels (probably shouldn't be hardcoded)
// maybe create a clever algorithm that searches for a channel named emu
const chan_emu = "552238617926303750"
var banned_channels = [
	"551534978417295410", // bot-design
]

var dagny = new bot()

// log errors
process.on('uncaughtException', function(err) {
  dagny.log(err)
  console.log(err)
});

client.on('ready', () => {
  var emuChannel = client.channels.get(chan_emu)
  dagny.log("Connected as " + client.user.tag)

  dagny.name("Emu")
  dagny.default_reply("...")
  dagny.keywords("emu ostrich cassowary bird")
  dagny.rating("G")
  emuji.load_dictionary()
  emuji.load_training_data()

  //var test = emuji.load_dictionary()
  //console.log(test)

  // set discord client "now playing"
  client.user.setActivity(dagny.play())

  // send greeting to channel
  //dagny.reply(emuChannel, msg="")

})


client.on('messageReactionAdd', (reaction, user) => {
	var user = user.username.toLowerCase()
	if (!(user.includes("emuji"))) {
		emuji.teach(reaction.emoji.name,reaction.message.content)
		//dagny.log("Trained " + reaction.emoji.name + " = " + reaction.message.content)
	}
})

client.on('messageReactionRemove', (reaction, user) => {
    console.log('a reaction has been removed')
})

// Reply to messages
client.on('message', (receivedMessage) => {
  var replyRequired = false
  var silent = false;

  // Prevent bot from responding to its own messages
  if (receivedMessage.author == client.user) { return } // catch and release

  var msg = receivedMessage.content;
  dagny.log(receivedMessage.channel + msg)

	if (receivedMessage.content.includes("emu")) {
		receivedMessage.react("🐤")
	}

	// React to all messages and log each reaction
	//var emuEmoji = emuji.react(receivedMessage.content)
	var emuEmoji = emuji.react(receivedMessage.content)

	var banned = false
	for (channel in banned_channels) {
		if (banned_channels[channel] == receivedMessage.channel.id) {
			banned = true
		}
	}

	if (!(banned)) {
		if ((emuEmoji) && (emuEmoji.length >= 0)) {
			for (var i = 0; i < emuEmoji.length; i++) {
				//console.log(i)
				//dagny.log(receivedMessage.channel + msg)
				receivedMessage.react(emuEmoji[i])
			}
		}
	}

  // Check if the bot's user was tagged in the message
  // Always reply to messages from any channel
  if (receivedMessage.isMentioned(client.user)) {
    // Get acknowledgement message from catbot
    var direct_input = receivedMessage.content.toLowerCase()
    var direct_output = "..."

    // Log acknowledgement message
    var msg = receivedMessage.content.toLowerCase();

    // Really need to modularize this function... (Done!)
    if (msg.includes("!gif")) {
      silent = true
      dagny.gif(receivedMessage.channel, msg);
    }

    if (msg.includes("!sticker")) {
      silent = true
      dagny.sticker(receivedMessage.channel, msg);
    }

		if (msg.includes("!learn")) {
			var aCommand = msg.split(" ") // because it's not lowercase
      var tmpCommand = ""
      var commandLoc = 0

			// double iteration has got to be a bad idea
			// but if it's stupid and it works it's not stupid
			for (var i = 0; i < aCommand.length; i++) {
				if (aCommand[i] == "!learn") {
					commandLoc = i + 1
				}
			}

			// get command
			for (var i = commandLoc; i < aCommand.length; i++) {
				tmpCommand = tmpCommand + "," + aCommand[i]
			}

			// replace any remaining spaces with commas and split on comma
			var cmdSplit = tmpCommand.replace(" ",",").split(",")
			console.log(tmpCommand.replace(" ",","))
			var learnEmoji = cmdSplit[1] // first item should be an emoji
			var learnDefine = ""

			console.log("learnEmoji: " + learnEmoji)

			// build string, skipping first item
			for (var i = 2; i < cmdSplit.length; i++) {
				// equals sign is optional in the command so ignore it
				if (cmdSplit[i] != "=") {
					// build comma separated definition string
					learnDefine = learnDefine + "," + cmdSplit[i]
				}
			}

			learnDefine = learnDefine.substring(1) // remove first comma
			var learnFile = "./logs/emoji-learn.txt"
			//if (!fs.existsSync(learnFile)) { fs.mkdirSync(learnFile) }

			fs.appendFileSync(learnFile, learnEmoji + "\t" + learnDefine + "\n");
			dagny.log("learned that " + learnEmoji + " = " + learnDefine)

			receivedMessage.channel.send("Emubot learned that " + learnEmoji + " = " + learnDefine)
		}

		if ((msg.includes("!refresh")) || (msg.toLowerCase().includes("!reload"))) {
      silent = true
      emuji.load_dictionary();
    }

    if (!(silent)) {
			var banned = false
			for (channel in banned_channels) {
				if (banned_channels[channel] == receivedMessage.channel.id) {
					banned = true
				}
			}

			if (!(banned)) {
	      dagny.reply(receivedMessage.channel, receivedMessage.content)
			}
    }
  } else {


	}
})

client.login(bot_secret.bot_secret_token)