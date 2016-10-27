// App ID for the skill
var APP_ID = 'amzn1.echo-sdk-ams.app.87696405-b058-4a93-90a2-ab1f6be26f2f';

var https = require('https');

// The AlexaSkill Module that has the AlexaSkill prototype and helper functions
var AlexaSkill = require('./AlexaSkill');

// URL prefix to fetch stop information from WMATA
var urlPrefix = 'https://api.wmata.com/NextBusService.svc/json/jPredictions?';

// WMATA API Key
var apiKey = 'kfgpmgvfgacx98de9q3xazww';

// Variable defining number of events to be read at one time, including the stop name.
 var paginationSize = 4;

// Variable defining the length of the delimiter between events 
var delimiterSize = 2;

// MetroBusSkill is a child of AlexaSkill.
var MetroBusSkill = function() {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
MetroBusSkill.prototype = Object.create(AlexaSkill.prototype);
MetroBusSkill.prototype.constructor = MetroBusSkill;

MetroBusSkill.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("MetroBusSkill onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);

    // any session init logic would go here
};

MetroBusSkill.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("MetroBusSkill onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    getWelcomeResponse(response);
};

MetroBusSkill.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);

    // any session cleanup logic would go here
};

MetroBusSkill.prototype.intentHandlers = {

    GetBusScheduleIntent: function (intent, session, response) {
        handleBusScheduleRequest(intent, session, response);
    },

    HelpIntent: function (intent, session, response) {
        var speechOutput = "With Metro, you can get real time bus arrival information for a route.  " +
            "For example, you could say L two, or forty, or you can say exit. Now, which route do you want?";
        response.ask(speechOutput);
    },

    FinishIntent: function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    }
};

// Function to handle the onLaunch skill behavior
function getWelcomeResponse(response) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "MetroBus Arrivals";
    var repromptText = "With Metro, you can get real time bus arrival information for a route.  For example, you could say L two, or fourty, or you can say exit. Now, which route do you want?";
    var speechOutput = "Metro Bus. What route do you want arrival information for?";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.

    response.askWithCard(speechOutput, repromptText, cardTitle, speechOutput);
}

// Gets a poster prepares the speech to reply to the user.
function handleBusScheduleRequest(intent, session, response) {
    // var stopIdSlot = intent.slots.StopID;
    // var StopID = stopIdSlot;
	// var StopID = "1001829";
    var sessionAttributes = {};
    var StopID = "1001810";
 
    // Read the first 4 events, then set the count to 4
    sessionAttributes.index = paginationSize;

    var content = "";

    getJsonEventsFromMetro(StopID, function (events) {
        var speechText = "";
        sessionAttributes.text = events;
        console.log(sessionAttributes.text);
        session.attributes = sessionAttributes;
        if (events.length === 0) {
            speechText = "There is a problem connecting to Metro at this time. Please try again later.";
            response.tell(speechText);
        } else {
            // cleaning up the output to sound a little more natural
            stopName = events[0].replace(/St/g, "Street");
            stopName = stopName.replace("+", "and");
            stopName = stopName.replace(/Rd/g, "Road");
            stopName = stopName.replace(/Pl/g, "Place");
            stopName = stopName.replace(/Nw/g, "Northwest");
            stopName = stopName.replace(/Sw/g, "Southwest");
            stopName = stopName.replace(/Ne/g, "Northeast");
            stopName = stopName.replace(/Se/g, "Southeast");

            speechText = "For the stop at " + stopName + ". ";
            for (i = 1; i < paginationSize; i++) {
                // cleaning up the output to sound a little more natural
                var predictionText = events[i];
                predictionText = predictionText.replace("will arrive in 0 minutes", "is arriving now");
                predictionText = predictionText.replace("will arrive in 1 minutes", "will arrive in 1 minute");
                speechText = speechText + predictionText + " ";
            }
            response.tell(speechText);
        }
    });
}

function getJsonEventsFromMetro(StopID, eventCallback) {
    var url = urlPrefix + 'api_key=' + apiKey + '&StopID=' + StopID;

    https.get(url, function(res) {
        var body = '';

        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            var stringResult = parseJson(body);
            eventCallback(stringResult);
        });
    }).on('error', function (e) {
        console.log("Got error: ", e);
    });
}

function parseJson(text) {
    text = JSON.parse(text);
    var stopName = text["StopName"];
    var predictions = text["Predictions"];
    var retArr = [];

    retArr.push(stopName);

    for (i=0; i < predictions.length; i++) {
        var RouteID = predictions[i].RouteID;
        var DirectionText = predictions[i].DirectionText;
        var Minutes = predictions[i].Minutes;
        var eventText = 'A route ' + RouteID + ' bus, heading ' + DirectionText + ', will arrive in ' + Minutes + ' minutes.';
        retArr.push(eventText);
    }

    if (text.length === 0) {
        return retArr;
    }
    return retArr;
}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the MetroBus Skill.
    var skill = new MetroBusSkill();
    skill.execute(event, context);
};
