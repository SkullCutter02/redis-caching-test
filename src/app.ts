import "reflect-metadata";
import { createConnection } from "typeorm";
import express from "express";
import argon2 from "argon2";

import client from "./utils/redisClient";
import User from "./entity/User";
import Post from "./entity/Post";

const app: express.Application = express();

app.use(express.json());

app.post("/auth/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const hash = await argon2.hash(password);
    const user = User.create({ username, email, hash });

    await user.save();
    return res.json(user);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ msg: "Something went wrong" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (user) {
      if (await argon2.verify(user.hash, password)) {
        return res.json(user);
      } else {
        return res.status(500).json({ msg: "Invalid credentials" });
      }
    } else {
      return res.status(500).json({ msg: "Invalid credentials" });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({ msg: "Something went wrong" });
  }
});

app.get("/users/:uuid", (req, res) => {
  try {
    const { uuid } = req.params;

    client.get(uuid, async (err, data) => {
      if (err) throw err;

      if (data !== null) {
        return res.json(JSON.parse(data));
      } else {
        const user = await User.findOneOrFail({ uuid });
        client.setex(user.uuid, 60, JSON.stringify(user));
        return res.json(user);
      }
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ msg: "Something went wrong" });
  }
});

app.get("/posts", (req, res) => {
  try {
    const { page, limit } = req.query;

    client.get(`posts.${page}.${limit}`, async (err, data) => {
      if (err) throw err;

      if (data !== null) {
        return res.json(JSON.parse(data));
      } else {
        const posts = await Post.find({
          relations: ["user"],
          skip: (+page - 1) * +limit,
          take: limit,
        });
        const count = await Post.count();

        const obj = { posts, hasMore: count > +page * +limit };
        client.setex(`posts.${page}.${limit}`, 60, JSON.stringify(obj));
        return res.json(obj);
      }
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

app.post("/posts", async (req, res) => {
  try {
    const { title, body, userUuid } = req.body;

    const user = await User.findOneOrFail({ uuid: userUuid });
    const post = Post.create({ title, body, user });

    await post.save();
    return res.json(post);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

const PORT = process.env.PORT || 5000;

createConnection()
  .then(async () => {
    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });
  })
  .catch((error) => console.log(error));
