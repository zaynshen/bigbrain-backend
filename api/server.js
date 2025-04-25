import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "../swagger.json" with { type: "json" };

import { AccessError, InputError } from "../src/error.js";
import {
  initDB,
  assertOwnsGame,
  assertOwnsSession,
  getAnswers,
  getEmailFromAuthorization,
  getGamesFromAdmin,
  getQuestion,
  getResults,
  hasStarted,
  login,
  logout,
  mutateGame,
  playerJoin,
  register,
  save,
  sessionResults,
  sessionStatus,
  submitAnswers,
  updateGamesFromAdmin,
} from "../src/service.js";

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "100mb" }));

const catchErrors = (fn) => async (req, res) => {
  try {
    await fn(req, res);
    save();
  } catch (err) {
    if (err instanceof InputError) {
      res.status(400).send({ error: err.message });
    } else if (err instanceof AccessError) {
      res.status(403).send({ error: err.message });
    } else {
      console.error(err);
      res.status(500).send({ error: "A system error occurred" });
    }
  }
};

const authed = (fn) => async (req, res) => {
  const email = getEmailFromAuthorization(req.header("Authorization"));
  await fn(req, res, email);
};

// === Routes ===
app.post("/api/admin/auth/login", catchErrors(async (req, res) => {
  const { email, password } = req.body;
  const token = await login(email, password);
  return res.json({ token });
}));

app.post("/api/admin/auth/register", catchErrors(async (req, res) => {
  const { email, password, name } = req.body;
  const token = await register(email, password, name);
  return res.json({ token });
}));

app.post("/api/admin/auth/logout", catchErrors(authed(async (req, res, email) => {
  await logout(email);
  return res.json({});
})));

app.get("/api/admin/games", catchErrors(authed(async (req, res, email) => {
  const games = await getGamesFromAdmin(email);
  return res.json({ games });
})));

app.put("/api/admin/games", catchErrors(authed(async (req, res, email) => {
  const { games } = req.body;
  await updateGamesFromAdmin({ gamesArrayFromRequest: games, email });
  return res.status(200).send({});
})));

app.post("/api/admin/game/:gameid/mutate", catchErrors(authed(async (req, res, email) => {
  const { gameid } = req.params;
  const { mutationType } = req.body;
  await assertOwnsGame(email, gameid);
  const data = await mutateGame({ gameId: gameid, mutationType });
  return res.status(200).send({ data });
})));

app.get("/api/admin/session/:sessionid/status", catchErrors(authed(async (req, res, email) => {
  const { sessionid } = req.params;
  await assertOwnsSession(email, sessionid);
  return res.status(200).json({ results: await sessionStatus(sessionid) });
})));

app.get("/api/admin/session/:sessionid/results", catchErrors(authed(async (req, res, email) => {
  const { sessionid } = req.params;
  await assertOwnsSession(email, sessionid);
  return res.status(200).json({ results: await sessionResults(sessionid) });
})));

app.post("/api/play/join/:sessionid", catchErrors(async (req, res) => {
  const { sessionid } = req.params;
  const { name } = req.body;
  const playerId = await playerJoin(name, sessionid);
  return res.status(200).send({ playerId });
}));

app.get("/api/play/:playerid/status", catchErrors(async (req, res) => {
  const { playerid } = req.params;
  return res.status(200).send({ started: await hasStarted(playerid) });
}));

app.get("/api/play/:playerid/question", catchErrors(async (req, res) => {
  const { playerid } = req.params;
  return res.status(200).send({ question: await getQuestion(playerid) });
}));

app.get("/api/play/:playerid/answer", catchErrors(async (req, res) => {
  const { playerid } = req.params;
  return res.status(200).send({ answers: await getAnswers(playerid) });
}));

app.put("/api/play/:playerid/answer", catchErrors(async (req, res) => {
  const { playerid } = req.params;
  const { answers } = req.body;
  await submitAnswers(playerid, answers);
  return res.status(200).send({});
}));

app.get("/api/play/:playerid/results", catchErrors(async (req, res) => {
  const { playerid } = req.params;
  return res.status(200).send(await getResults(playerid));
}));


app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get("/api/healthz", (req, res) => {
  res.status(200).send("OK");
});

await initDB();

export default app;
