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


var questionWords = []
client.on('ready', () => {
  var emuChannel = client.channels.get(chan_emu)
  dagny.log("Connected as " + client.user.tag)

  dagny.name("Emu")
  dagny.default_reply("...")
  dagny.keywords("objectivism ayn rand atlas shrugged")
  dagny.rating("G")
  emuji.load_dictionary()
  emuji.load_training_data()

  //var test = emuji.load_dictionary()
  //console.log(test)

  // set discord client "now playing"
  var currentYear = new Date
  currentYear.getFullYear

  var nowPlayingText = "Train Simulator " + (currentYear.getFullYear() + 1) 
  console.log(nowPlayingText)
  client.user.setActivity(nowPlayingText)

  // send greeting to channel
  //dagny.reply(emuChannel, msg="")

  questionWords.push("who")
  questionWords.push("what")
  questionWords.push("where")
  questionWords.push("how")
  questionWords.push("why")
  questionWords.push("when")
  questionWords.push("which")
  questionWords.push("do")
  questionWords.push("does")
  questionWords.push("did")
  questionWords.push("will")
  questionWords.push("wont")
  questionWords.push("would")
  questionWords.push("could")
  questionWords.push("should")
  questionWords.push("can")
  questionWords.push("have")
  questionWords.push("may")
  questionWords.push("am")
  questionWords.push("are")
  questionWords.push("is")
  questionWords.push("was")
  questionWords.push("were")
  questionWords.push("please")

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

  var msg = receivedMessage.content
  var msg_lc = msg.toLowerCase()
  dagny.log(receivedMessage.channel + msg)


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
				//receivedMessage.react(emuEmoji[i])
			}
        }
        
        if (isQuestion(msg_lc)) {
            receivedMessage.react("❔")
        }

        if (msg_lc.includes("john galt")) {
            receivedMessage.react("🚂")
        }
    }
    
    if (msg_lc.includes("who is dagny")) {
        receivedMessage.channel.send("Who is John Galt?")
    }

    if (msg_lc.includes("who is john galt")) {
        receivedMessage.channel.send("...")
    }

})

function isQuestion(text) {
    var retVal = false
    
    console.log("Is it a question: " + text)
    var aText = text.split(" ")
    var firstWord = aText[0]
    firstWord = firstWord.replace("'","")
    var lastLetter = text.slice(-1)

    // is in the list of question words
    for (var word in questionWords) {
        console.log(word)
        console.log(" " + firstWord.includes(questionWords[word]))
        if (firstWord.includes(questionWords[word]) || (firstWord === questionWords[word])) {
            retVal = true
        }
    }
    
    if (lastLetter == ".") { retVal = false }
    if (lastLetter == "?") { retVal = true }

    console.log(retVal)
    return retVal
}
client.login(bot_secret.bot_secret_token)