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
const chan_dagny = "628428702287659008"

var banned_channels = [
  "551534978417295410", // bot-design
  "635737039517777931"
]

var dagny = new bot()

// log errors
process.on('uncaughtException', function(err) {
  dagny.log(err)
  console.log(err)
});


var questionWords = []
client.on('ready', () => {

  var dagnyChannel = client.channels.get(chan_dagny)
  dagny.log("Connected as " + client.user.tag)

  dagny.name("Dagny")
  dagny.default_reply("Who is John Galt?")
  dagny.keywords("objectivism ayn rand atlas shrugged")
  dagny.rating("PG13")
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
  questionWords.push("whos")
  questionWords.push("what")
  questionWords.push("whats")
  questionWords.push("whatre")
  questionWords.push("where")
  questionWords.push("wheres")
  questionWords.push("whered")
  questionWords.push("how")
  questionWords.push("hows")
  questionWords.push("why")
  questionWords.push("whys")
  questionWords.push("when")
  questionWords.push("whens")
  questionWords.push("which")
  questionWords.push("do")
  questionWords.push("dont")
  questionWords.push("does")
  questionWords.push("doesnt")
  questionWords.push("did")
  questionWords.push("didnt")
  questionWords.push("will")
  questionWords.push("wont")
  questionWords.push("would")
  questionWords.push("wouldnt")
  questionWords.push("could")
  questionWords.push("couldnt")
  questionWords.push("should")
  questionWords.push("shouldnt")
  questionWords.push("can")
  questionWords.push("cant")
  questionWords.push("have")
  questionWords.push("havent")
  questionWords.push("may")
  questionWords.push("am")
  questionWords.push("aint")
  questionWords.push("are")
  questionWords.push("arent")
  questionWords.push("is")
  questionWords.push("isnt")
  questionWords.push("was")
  questionWords.push("wasnt")
  questionWords.push("were")
  questionWords.push("werent")
  questionWords.push("please")
})


client.on('messageReactionAdd', (reaction, user) => {
    //console.log(user)
	var user = user.username.toLowerCase()
    /*
    if (!(user.includes("emuji"))) {
		emuji.teach(reaction.emoji.name,reaction.message.content)
		//dagny.log("Trained " + reaction.emoji.name + " = " + reaction.message.content)
    }
    */  
   console.log(user)

    var react = reaction
    var message = reaction.messageReaction
    
    var msg = {}
    msg.author = reaction.author
    //msg.isabot = reaction.author.bot
    msg.channel = reaction.channel
    msg.date = reaction.createdTimestamp
    msg.content = reaction.content
    msg.reactions = reaction.reactions
    console.log(msg)
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

function stripPunctuation(text) {
  var tmp = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"")
  //tmp = tmp.replace(/\s{2,}/g," ")
  return tmp
}

function isQuestion(text) {
    var retVal = false
    var questionScore = 0

    console.log("Is it a question: " + text)
    var aText = text.split(" ")
    var firstWord = aText[0]
    if ((firstWord == "but") || (firstWord == "and") || (firstWord == "so")) { 
      aText.shift()
      firstWord = aText[0] 
    }
    var lastWord = aText[aText.length - 1]

    firstWord = firstWord.replace("'","")
    lastWord = stripPunctuation(lastWord)

    var lastLetter = text.slice(-1)

    // is in the list of question words
    for (var word in questionWords) {
        if (firstWord === questionWords[word]) {
            questionScore +=2
        }

        if (lastWord.includes(questionWords[word]) || (lastWord === questionWords[word])) {
            questionScore++
        }
    }
    
    if ((lastLetter == ".") || (lastLetter == "!")) { questionScore-- }
    if (lastLetter == "?") { questionScore +=2 }
    if (text.includes("?")) { questionScore +=2 }

    if (questionScore > 0) { retVal = true }

    console.log("Question score: " + questionScore)
    console.log(retVal)
    return retVal
}
client.login(bot_secret.bot_secret_token)