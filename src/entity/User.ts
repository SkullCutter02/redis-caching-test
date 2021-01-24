import { Column, Entity, OneToMany, Unique } from "typeorm";

import Model from "./Model";
import Post from "./Post";

@Entity("users")
@Unique(["username", "email"])
export default class User extends Model {
  @Column()
  username: string;

  @Column()
  email: string;

  @Column()
  hash: string;

  @OneToMany(() => Post, (post) => post.user)
  posts: Post[];

  toJSON(): any {
    return { ...this, hash: undefined, id: undefined };
  }
}
