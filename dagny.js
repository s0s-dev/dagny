var dev = true // development mode

const bot_secret = require('./lib/bot-secret')
var bot = require('./lib/bot')

const discord = require('discord.js')
const client = new discord.Client()

var discord_token = process.env.BOT_SECRET || bot_secret.bot_secret_token

var lemmatizer = require('lemmatizer')
var Sentiment = require('sentiment')
var sentiment = new Sentiment()

const dagnyUserID = "Dagny#3183"

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
})

loadDictionary()

var questionWords = []
var yesWords = []
var noWords = []

client.on('ready', () => {

  var dagnyChannel = client.channels.get(chan_dagny)
  dagny.log("Connected as " + client.user.tag)

  dagny.name("Dagny")
  dagny.default_reply("Who is John Galt?")
  dagny.keywords("objectivism ayn rand atlas shrugged")
  dagny.rating("PG13")

  // set discord client "now playing"
  var currentYear = new Date
  currentYear.getFullYear

  var nowPlayingText = "Train Simulator " + (currentYear.getFullYear() + 1) 
  console.log(nowPlayingText)
  client.user.setActivity(nowPlayingText)

  // send greeting to channel
  //dagny.reply(emuChannel, msg="")

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
  //console.log(dict)

  console.log(questionWords)

  var replyRequired = false
  var silent = false;

  // Prevent bot from responding to its own messages
  if (receivedMessage.author == client.user) { return } // catch and release

  var msg = receivedMessage.content
  var msg_lc = msg.toLowerCase()
  dagny.log(receivedMessage.channel + msg)

	var banned = false
	for (channel in banned_channels) {
		if (banned_channels[channel] == receivedMessage.channel.id) {
			banned = true
		}
	}

	if (!(banned)) {
    var chan = receivedMessage.channel.name
    var regex = /^[0-9]+$/g // begins with a number
    
    // allows channels to be named with -[name] 
    /// like we have been doing on discord 
    var aChan = chan.split("-")
    if (aChan[0]) { chan = aChan[0] }

    // only post in numbered channels
    if (chan.match(regex)) {
      var yesScore = isYesNo(msg_lc) 

      console.log("Yes Score: " + yesScore)
      if (isQuestion(msg_lc))   { receivedMessage.react("❔") }
      if (yesScore > 0)         { receivedMessage.react("👍") }
      if (yesScore < 0)         { receivedMessage.react("👎") }

      if (msg_lc.includes("who is dagny")) {
        receivedMessage.channel.send("Who is John Galt?")
      }

      if (msg_lc.includes("john galt")) {
          receivedMessage.react("🚂")
      }

      if (msg_lc.includes("who is john galt")) {
          receivedMessage.channel.send("...")
      }

      // Add words to the sentiment dictionary to customize 
      // as we go. It's missing quite a few.
      var options = {
        extras: {
          'cat': 2,
          'cats': 2,
          'yes': 0,
          'no': 0,
          'depression': -2
        }
      }

      console.log(receivedMessage.author.id)
      // make sure it's the $O$ user whose emotions are being saved
      if ((receivedMessage.author.id == "606641408044171264") || dev) {
        console.log("Lemmatized text: " + lemmatize(msg_lc))
        var sentiment_analysis = sentiment.analyze(msg_lc, options)
        console.log(sentiment_analysis)
  
        // this is for performance reasons
        // switch statements are slower
        var sentiment_emoji
        if (sentiment_analysis.score >= 10) {
          sentiment_emoji = "🤩"
        } else if (sentiment_analysis.score > 5) {
          sentiment_emoji = "😃"
        } else if (sentiment_analysis.score > 0) {
          sentiment_emoji = "🙂"
        } else if (sentiment_analysis.score == 0) {
          //sentiment_emoji = "😐"
        } else if (sentiment_analysis.score < -10) {
          sentiment_emoji = "😠"
        } else if (sentiment_analysis.score < -5) {
          sentiment_emoji = "😥"
        } else if (sentiment_analysis.score < 0) {
          sentiment_emoji = "🙁"
        } else {
          sentiment_emoji = "😶"
        }
        
        if (sentiment_emoji) { 
          var emo = {}
          emo.channel = receivedMessage.channel.name
          emo.channel_id = receivedMessage.channel.id
          emo.message = msg_lc
          emo.sentiment = sentiment_analysis.score
          emo.reaction = sentiment_emoji
          emo.date = Date.now()
  
          // react in channel
          receivedMessage.react(sentiment_emoji) 
  
          // save to database
          console.log(emo)
          dagny.insertDataMongo(emo,"dagny","emo")
        }    
      }     
    }
  }
})

function lemmatize(phrase) {
  console.log("Lemmatize function: " + phrase)
  var retval = ""
  var tmp = phrase.toLowerCase() //jic
  var aTmp = tmp.split(" ")
  var aOut = []
  if (aTmp) {
    for (var i in aTmp) {
      aOut.push(lemmatizer.lemmatizer(aTmp[i]))
    }
  }

  if (aOut) {
    aOut.sort()
    for (var i = 0; i < aOut.length; i++) {
      if (i == 0) { retval = aOut[i] + " " }
      if ((i > 0) && (aOut[i] != aOut [i-1])) {
        retval += aOut[i] + " "
      }
    }
    return retval
  }
}


var dict
function loadDictionary(emoji = "") {
	var query = { }
	if (emoji) {
		query.name = emoji
	}

  var formatting = { date:1,user:1,text:1, _id:0}
  formatting = {}

	var initializePromise = dagny.getDataMongo("dagny","dictionary",query,formatting)
  initializePromise.then(function(result) {
      dict = result
      console.log("Initialized dictionary")
      parseDictionary(dict)

      return result
      resolve(result)
  }, function(err) {
      console.log(err);
  })
}

function parseDictionary(dict) {
  for (var i in dict) {
    var tmp = dict[i]
    if (tmp.name == "❔") {
      questionWords.push(stripPunctuation(tmp.keyword))
    }
    if (tmp.name == "👍") {
      yesWords.push(stripPunctuation(tmp.keyword))
    }
    if (tmp.name == "👎") {
      noWords.push(stripPunctuation(tmp.keyword))
    }
  }
}

function stripPunctuation(text) {
  var tmp = text.replace(/[.,\/#'!$%\^&\*;:{}=\-_`~()]/g,"")
  //tmp = tmp.replace(/\s{2,}/g," ")
  return tmp
}

function isYesNo(text) {
  console.log ("Yes score: " + text)
  text = stripPunctuation(text)
  var aText = text.split(" ")
  var firstWord = aText[0]
  var yesScore = 0

  // weight the first word
  for (var i in yesWords) {
    if (firstWord == yesWords[i]) { yesScore += 2 }
  }

  for (var i in noWords) {
    if (firstWord == noWords[i]) { yesScore -= 2 }
  }
  
  // check against list of yes and no words and balance accordingly 
  for (var word in aText) {
    console.log(aText[word])

    for (var i in yesWords) {
      if (aText[word] == yesWords[i]) { 
        yesScore++ 
      }
    }
    for (var i in noWords) {
      if (aText[word] == noWords[i]) { 
        yesScore-- 
      }
    }
  }

  console.log("Yes Score: " + yesScore)
  return yesScore
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
      var tmp = questionWords[word]
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
client.login(discord_token)
