/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import "@tensorflow/tfjs";
import { Howl } from "howler";
import * as mobilenet from "@tensorflow-models/mobilenet";
import * as knnClassifier from "@tensorflow-models/knn-classifier";
import { initNotifications, notify } from "@mycv/f8-notification";

import "./App.css";
// import mp3 file
const soundURL = require("./assets/Dont.mp3");

var sound = new Howl({
  src: [soundURL],
});

const NOT_TOUCH_LABEL: string = "not_touch";
const TOUCHED_LABEL: string = "touched";
const TRAINING_TIME: number = 50;
const TOUCHED_CONFIDENCE: number = 0.7;

function App() {
  const videoRef: any = useRef();
  const classifier: any = useRef();
  const canPlayAudio: any = useRef(true);
  const mobilenetModule: any = useRef();
  const [touch, setTouch] = useState(false);

  const init = async () => {
    console.log("init...");

    await setupCamera();
    console.log("setup camera success...");

    // Create the classifier.
    classifier.current = knnClassifier.create();
    // Load mobilenet.
    mobilenetModule.current = await mobilenet.load();

    console.log("setup complete");

    initNotifications({ cooldown: 3000 });
  };

  const setupCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia =
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia;

      if (!navigator.getUserMedia) {
        reject();
      } else {
        navigator.getUserMedia(
          { video: true },
          (stream) => {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener("loadeddata", resolve);
          },
          (error) => reject(error)
        );
      }
    });
  };

  const train = async (label: string) => {
    console.log(`[${label}] Dang train`);

    for (let i = 0; i < TRAINING_TIME; i++) {
      console.log(`Process ${Math.round(((i + 1) / TRAINING_TIME) * 100)}%`);
      await training(label);
    }
  };

  const training = (label: string) => {
    return new Promise(async (resolve) => {
      const embedding = mobilenetModule.current.infer(videoRef.current, true);

      classifier.current.addExample(embedding, label);

      await sleep(200);

      resolve(true);
    });
  };

  const run = async () => {
    const embedding = mobilenetModule.current.infer(videoRef.current, true);

    const result = await classifier.current.predictClass(embedding);

    if (
      result.label === TOUCHED_LABEL &&
      result.confidences[result.label] > TOUCHED_CONFIDENCE
    ) {
      console.log("Touched");
      if (canPlayAudio.current) {
        canPlayAudio.current = false;
        sound.play();
      }
      notify("Don't", { body: "Don't touch your face" });
      setTouch(true);
    } else {
      console.log("Not touch");
      setTouch(false);
    }

    await sleep(200);

    run();
  };

  const sleep = (ms: number = 0) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  useEffect(() => {
    init();

    sound.on("end", function () {
      canPlayAudio.current = true;
    });

    return () => {};
  }, []);

  return (
    <div className={`App ${touch ? "touched" : ""}`}>
      <video className="video" autoPlay ref={videoRef}></video>
      <div className="control">
        <button className="btn" onClick={() => train(NOT_TOUCH_LABEL)}>
          Train 1
        </button>
        <button className="btn" onClick={() => train(TOUCHED_LABEL)}>
          Train 2
        </button>
        <button className="btn" onClick={() => run()}>
          Run
        </button>
      </div>
    </div>
  );
}

export default App;
