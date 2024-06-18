const Koa = require('koa');
const app = new Koa();
const fs = require("fs");
const path = require('path');
const staticFiles = require('koa-static'); //for static files service
const parameter = require('koa-parameter');
const { koaBody } = require('koa-body'); //instead of bodyParser
const Router = require('koa-router');
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const readline = require("readline");
const { setTimeout } = require('timers/promises');

const router = new Router();

router.get('/', async (ctx, next) => {
  ctx.response.status = 200;
  ctx.response.set("Content-Type", "text/html");
  ctx.response.body = fs.readFileSync("index.html");
})

router.post('/tts', async (ctx, next) => {
  console.log('ctx.request.body:', ctx.request.body);
  // got the request parameter
  const { id, key, text } = ctx.request.body;

  try {
    console.log('Received text:', text);
    await tts(text, id ? id + '.mp3' : '0.mp3', key);
    ctx.body = { status: 'success', receivedText: text, speechFile: `${id}.mp3` };
    ctx.status = 200;
  }catch(error){
    console.log(error)
  }
})

app.use(staticFiles(path.resolve(__dirname, "./public")));
app.use(koaBody());
app.use(parameter(app));
app
  .use(router.routes())
  .use(router.allowedMethods());


//setting different PORT by NODE_ENV
if (process.env.NODE_ENV === "production") {
  process.env.PORT = 3002;
} else if (process.env.NODE_ENV === "dev") {
  process.env.PORT = 3001;
}

app.listen(process.env.PORT, () => {
  console.log('server is running at http://localhost:' + process.env.PORT);
});


//tts function
function tts(textContent, filename, pSubscriptionKey) {
  return new Promise((resolve, reject) => {
    // setup speech service configure
    var subscriptionKey = pSubscriptionKey;//subscription key
    var serviceRegion = "eastasia"; // Region
    var filePathName = "public/speech/" + filename;

    var audioConfig = sdk.AudioConfig.fromAudioFileOutput(filePathName);
    var speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);

    // The language of the voice that speaks.
    speechConfig.speechSynthesisLanguage = "eastasia"; 
    speechConfig.speechSynthesisVoiceName = "zh-CN-XiaochenMultilingualNeural"
    speechConfig.speechSynthesisOutputFormat = 5; // 5 for mp3 format

    // create the speech synthesizer.
    var synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // start the synthesizer and wait for a result.
    synthesizer.speakTextAsync(textContent,
      function (result) {
        synthesizer.close();
        synthesizer = undefined;
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          console.log("synthesis finished.");
          resolve(`Audio file is ready!(${filename})`)
          return fs.createReadStream(filePathName);
        } else {
          console.error("Speech synthesis canceled, " + result.errorDetails +
            "\nDid you update the subscription info?");
        }
      },
      function (err) {
        console.trace("err - " + err);
        synthesizer.close();
        synthesizer = undefined;
        reject('Audio faild!');
      });
  })


}