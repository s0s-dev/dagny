var MongoClient = require('mongodb').MongoClient

var bot_secret = require("./bot-secret.js")
const db_url = bot_secret.mongo_url

const fs = require('fs')
const path = require('path')
const dclassify = require('dclassify');
const sortJsonArray = require('sort-json-array');

var Classifier = dclassify.Classifier;
var DataSet    = dclassify.DataSet;
var Document   = dclassify.Document;

var emuji_library = []
var mongo_library

var good_emojis = []
var bad_emojis = []

const { createLogger, format, transports } = require('winston')
const env = process.env.NODE_ENV || 'development'

require('winston-daily-rotate-file')

const log_dir = "logs" // log directory
const log_file = "emuji"

var user_training_good = []
var user_training_bad = []

var good_file = fs.readFileSync("./learn/good.txt").toString().split("\n")
var bad_file = fs.readFileSync("./learn/bad.txt").toString().split("\n")
var potential_file = fs.readFileSync("./learn/potential.txt").toString().split("\n")
var emu_file = fs.readFileSync("./learn/training.txt").toString().split("\n")

// Create the log & conf directories if it does not exist
if (!fs.existsSync(log_dir)) { fs.mkdirSync(log_dir) }

// const filename = path.join(log_dir, 'emuji.log')
const dailyRotateFileTransport = new transports.DailyRotateFile({
  filename: `${log_dir}/${log_file}-%DATE%.log`,
  datePattern: 'YYYY-MM-DD'
})

// generic logger
const logger = createLogger({
  // change level if in dev environment versus production
  level: env === 'development' ? 'debug' : 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    new transports.Console({
      level: 'info',
      format: format.combine(
        format.colorize(),
        format.printf(
          info => `${info.timestamp} ${info.level}: ${info.message}`
        )
      )
    }),
    dailyRotateFileTransport
    //new transports.File({ filename })
  ]
})

// This function was copied and pasted from the internet
// It works and I understand why it works, but still.
function uniqueMatches(a) {
  return a.sort().filter(function(item, pos, ary) {
    return !pos || item != ary[pos - 1]
  })
}

module.exports = {
	load_dictionary: function() {
		var col = "dictionary"
		var dictionary

		MongoClient.connect(db_url, function(err, db) {
		  if (err) throw err

		  var dictionary_db = db.db("emuji")
		  dictionary_db.collection("dictionary").find({}).toArray(function(err, result) {
		    if (err) throw err
		    dictionary = result
				mongo_library = result

				//console.log(mongo_library)
				logger.info("@emuji: dictionary loaded from db")

				return dictionary
		  })
		})
	},

	// I think this one actually is being used...
	train: function(emoji,msg) {
		// build training data
		var dbo = db.db("emuji")

		var phrase = {
			name: emoji,
			keyword: msg
		}

		//train.info(emoji + "\t" + msg + "\t user")
	},

	// *** important note ***
	// Nothing uses this function...
	teach: function(emoji,msg) {
		// it's only still here because I'm
		// worried that something might and
		// this thing crashes enough already

		// learn from user input
		// these are separate files because I expect
		// clutter from the user data

		var phrase = {}
		phrase.name = emoji
		phrase.keyword = msg

		if (phrase) {
			if ((phrase.name) && (phrase.keyword)) {
				MongoClient.connect(db_url, function(err, client) {
					if (err) throw err

					//var dictionary_db = db.db("emuji")
					const collection = client.db("emuji").collection("user_training_raw")

					var result = collection.insertOne(phrase, function(err,result) {
						if (err) throw err

						//console.log(mongo_library)
						logger.info("Emuji learned " + phrase.name + " : " + phrase.keyword)
						return
					})
				})
			}
		}
	},
  classify: function(emoji) {
		var tmp
		var user_trained = []
		var actual_reactions = {}
		var potential_reactions = {}

		var items_good = new Document('item1', user_training_good)
		var items_bad = new Document('item2', user_training_bad)

		// create a DataSet and add test items to appropriate categories
		// this is 'curated' data for training
		var data = new DataSet()
		data.add('good', [items_good]) //,items_good_emu,items_potential
		data.add('bad', [items_bad]) //,items_potential

		// an optimisation for working with small vocabularies
		var options = {
		   //applyInverse: true
		}

		// create a classifier
		var classifier = new Classifier(options);

		// train the classifier
		classifier.train(data);
		//console.log(JSON.stringify(classifier.probabilities, null, 4));

		// test the classifier on a new test item
		var testDoc = new Document('testDoc', [emoji]);
		var result = classifier.classify(testDoc);

		return result
	},
	react: function(input) {
		var msg = input.toLowerCase()
		var fuzz = Math.random()
		var emoji = []
		var jsonEmoji = []
		var jsonRejected = []
    var emoji_direct_match = []
		var emoji_indirect_match = []
		var keywords_direct_match = []
		var keywords_indirect_match = []
		var output_array = []

    if (msg && (!(msg === undefined))) {
      msg = msg.toLowerCase().replace(/[.,\/#!\\?$%\^&\*;:{}=\-_`~()]/g,"").replace(/\n/g," ")

			// split message by spaces
			var aMsg = msg.split(" ")

			// loop through emoji library
			for (var i in mongo_library) {
				var mongo_emoji = mongo_library[i]

				// split by tab to separate emoji from word list

				var emoji_match = mongo_emoji.name // emoji
				var keyword = mongo_emoji.keyword // keyword_list

				var q = keyword.replace(/\"/,' ') // remove quotes
				var q = keyword.replace(/\n/g," ") // replace new line with space (it happens)

				// search each keyword against the received message
				for (word in aMsg) {
					var wordsearch = aMsg[word]
					// make sure it exists
					if (wordsearch) {
						// direct match
						if (wordsearch == q) {
							emoji_direct_match.push(emoji_match)
							keywords_direct_match.push(wordsearch)
						}

						// indirect match
						if (wordsearch.includes(q)) {
							if (!(wordsearch == q)) {
								emoji_indirect_match.push(emoji_match)
								keywords_indirect_match.push(wordsearch)
							}
						}
					}
				}
			}
		}
		// merge arrays in order

		// emoji direct matches
		for (var i = 0; i < emoji_direct_match.length; i++) {
			var thisJsonEmoji = {}
			var classified = this.classify(emoji_direct_match[i])
			thisJsonEmoji.name = emoji_direct_match[i]
			thisJsonEmoji.keyword = keywords_direct_match[i]
			thisJsonEmoji.category = classified.category
			thisJsonEmoji.probability = classified.probability
			thisJsonEmoji.match = "direct"
			jsonEmoji.push(thisJsonEmoji)
		}

		// emoji indirect matches
		for (var i = 0; i < emoji_indirect_match.length; i++) {
			// only add if there is not a corresponding direct match
			// to avoid conflicts and reduce the overall emoji count
			var do_not_add = false
			for (var j = 0; j < keywords_direct_match.length; j++) {
				var direct_classified = this.classify(emoji_direct_match[j])
				var indirect_classified = this.classify(emoji_indirect_match[i])

				if (emoji_direct_match[j] == emoji_indirect_match[i]) {
					if (direct_classified.probability > indirect_classified.probability) {
						// filter out equal matches by probability
						do_not_add = true
					}
				}
				if (keywords_direct_match[j] == keywords_indirect_match[i]) {
					if (direct_classified.probability > indirect_classified.probability) {
						// filter out equal matches by probability
						do_not_add = true
					}
				}
			}

			// log saved emojis
			var thisJsonEmoji = {}
			var classified = this.classify(emoji_indirect_match[i])
			thisJsonEmoji.name = emoji_indirect_match[i]
			thisJsonEmoji.keyword = keywords_indirect_match[i]
			thisJsonEmoji.category = classified.category
			thisJsonEmoji.probability = classified.probability
			thisJsonEmoji.match = "indirect"

			if (!(do_not_add)) { // do if not don't
				jsonEmoji.push(thisJsonEmoji)
			} else {
				// log rejected emojis
				jsonRejected.push(thisJsonEmoji)
			}
		}

		// log all potential matches to the database
		var concat_emojis = jsonEmoji.concat(jsonRejected)
		if ((concat_emojis) && (concat_emojis.length > 0)) {
			MongoClient.connect(db_url, function(err, client) {
				if (err) throw err

				const collection = client.db("emuji").collection("reactions_potential")
				var result = collection.insertMany(concat_emojis, function(err,result) {
					if (err) throw err
					return
				})
			})
		}

		// remove duplicate emojis
		// sort by emoji
		var new_array = []
		var dupe_array = []
		var lastItem = {}

		var jsonSorted = sortJsonArray(jsonEmoji,"keyword")
		for (var item in jsonSorted) {
			var thisItem = jsonSorted[item]

			if (lastItem === jsonSorted[i]) {
				//console.log(lastItem.hasOwnProperty('keyword'))
				if (thisItem.keyword != lastItem.keyword) {
					new_array.push(thisItem)
				} else {
					if (thisItem.probability > lastItem.probability) {
						new_array.push(thisItem)
					} else {
						dupe_array.push(thisItem)
					}
				}
			} else {
				// always push first item
				new_array.push(thisItem)
			}
			lastItem = thisItem
		}

		dupe_array = sortJsonArray(dupe_array,"probability","des")
		var throw_array = []
		if (dupe_array) {
			// build array with only one of the duplicates
			for (var i = 0; i < dupe_array.length; i++) {
				var thisArray = dupe_array[i]
				var thatArray = throw_array[i]

				//if (thisArray.emoji !== thatArray.emoji) {
					throw_array.push(new_array[i])
				//}
			}

			//jsonSorted = throw_array
		}

		// sort array by probability
		jsonSorted = sortJsonArray(jsonSorted,"probability","des")

		var bias = 0
		var count = 0
		var final_array = []
		for (react in jsonSorted) {
			var snap = Math.random()
			var snapPercent = Math.random() // set this to a decimal value .5 == 50%
			var reaction = jsonSorted[react]

			// always output one emoji if there is one
			if (count == 0) { final_array.push(reaction) }

			// show a random number of emjois afterwards
			// snap is biased towards "goodness" of the emoji
			// whatever that even really means at this point
			if ((count > 0) && ((snap + bias) < snapPercent)) {
				if (reaction.category == "good") {
					final_array.push(reaction)
				}
			}
			count++
		}

		// add array to output file
		if (final_array) {
			for (var i = 0; i < final_array.length; i++) {
				// strip quotes, spaces and common puntuation
				var reaction = final_array[i]
				var output_emoji = reaction.name
				var output_word = reaction.keyword.replace(/"/g, "") // strip quotes
				output_word = output_word.replace(/[.,\/#!\\?$%\^&\*;:{}=\-_`~()]/g,"") // I got this from the internet

				//learn.info(output_emoji + '\t' + output_word)
				logger.info("@emu reacted to '" + output_word + "' with " + output_emoji)

				output_array.push(output_emoji)
			}
		}

		if ((final_array) && (final_array.length > 0)) {
			// log output emojis to database for training
			MongoClient.connect(db_url, function(err, client) {
				if (err) throw err

				const collection = client.db("emuji").collection("reactions")
				var result = collection.insertMany(final_array, function(err,result) {
					if (err) throw err
					return
				})
			})
		}

		return output_array
	},
  randomFishEmoji: function() {

    var fishReaction = []
    fishReaction[0] = "🐟"
    fishReaction[1] = "🐟"
    fishReaction[2] = "🐟"
    fishReaction[3] = "🐟"
    fishReaction[4] = "🐟"
    fishReaction[5] = "🐠"
    fishReaction[6] = "🐡"
    fishReaction[7] = "🎣"
    fishReaction[8] = "🎣"
    fishReaction[9] = "🎣"

    var randomReaction = Math.floor(Math.random() * fishReaction.length)
    return fishReaction[randomReaction]
  },

  randomCatEmoji: function(msg) {

    var catReaction = []
    catReaction[0] = "😺"
    catReaction[1] = "😸"
    catReaction[2] = "😹"
    catReaction[3] = "😻"
    catReaction[4] = "😼"
    catReaction[5] = "😽"
    catReaction[6] = "🙀"
    catReaction[7] = "😿"
    catReaction[8] = "😾"
    catReaction[9] = "🐱"
    catReaction[10] = "🐈"
    catReaction[11] = "🦁"
    catReaction[12] = "🐯"
    catReaction[13] = "🐅"
    catReaction[14] = "🐆"

    var randomReaction = Math.floor(Math.random() * catReaction.length)
    return catReaction[randomReaction]
  },

  randomTreatEmoji: function() {

    var treatReaction = []
    treatReaction[0] = "🐟"
    treatReaction[1] = "🍦"
    treatReaction[2] = "🍧"
    treatReaction[3] = "🍨"
    treatReaction[4] = "🍩"
    treatReaction[5] = "🍪"
    treatReaction[6] = "🍰"
    treatReaction[7] = "🍫"
    treatReaction[8] = "🍬"
    treatReaction[9] = "🍭"
    treatReaction[10] = "🍮"
    treatReaction[11] = "🍍"
    treatReaction[12] = "🐁"
    treatReaction[13] = "🍡"

    var randomReaction = Math.floor(Math.random() * treatReaction.length)
    return treatReaction[randomReaction]
  },
	load_training_data: async function() {
		// create promise
		MongoClient.connect(db_url, function(err, db) {

			var emuji_db = db.db("emuji")
			var user_good = emuji_db.collection("user_training_good")
			var reactions_actual = emuji_db.collection("reactions")
			var reactions_potential = emuji_db.collection("reactions_potential")

 			//user_training.find().toArray(function(err, items) {})

			//{mykey:{$ne:2}}
			var stream = user_good.find({}, {name:1, _id:0}).stream();
			stream.on("data", function(item) {
				//console.log(item)
				user_training_good.push(item.name)
			})
			stream.on("end", function() { return })

			var stream = reactions_actual.find({}, {name:1, _id:0}).stream();
			stream.on("data", function(item) {
				//console.log(item)
				user_training_good.push(item.name)
				//reactions.push(item)
			})
			stream.on("end", function() { return })

			var stream = reactions_potential.find({}, {name:1, _id:0}).stream();
			stream.on("data", function(item) {
				user_training_good.push(item.name)
				user_training_bad.push(item.name)
			})
			stream.on("end", function() {
				return user_training_good
			})
		})
	},
	parseTrainingData: function(training_data) {
		var output = []

		if (training_data) {
			// read through file line by line
			for (item in training_data) {
				var lineItem = training_data[item]
				var emoji = lineItem.name
				if (emoji) {
					output.push(emoji)
				}
			}
		}
		output = output.sort()
		return output
	},
	parseTrainingFile: function(file_data) {
		var output = []

		if (file_data) {
			// read through file line by line
			for (line in file_data) {
				var lineData = file_data[line]
				var aLine = lineData.split("\t")

				if (aLine[0]) {
					output.push(aLine[0])
				}
			}
		}
		output = output.sort()
		return output
	}
}