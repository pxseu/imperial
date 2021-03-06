import { Router, Request, Response } from "express";
import { IUser, Users } from "../models/Users";
import { hash } from "bcryptjs";

// Middleware
import { checkAuthenticated } from "../middleware/checkAuthenticated";
import { checkNotAuthenticated } from "../middleware/checkNotAuthenticated";

// Utilities
import { mail } from "../utilities/mailer";
import { signToken } from "../utilities/signToken";
import { verifyToken } from "../utilities/verifyToken";
import { rateLimiter } from "../utilities/apiLimit";

export const routes = Router();

// default pages
routes.get("/", (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    Users.findOne({ _id: req.user.toString() }, (err: string, user: IUser) => {
      res.render("index.ejs", {
        loggedIn: true,
        pfp: user.icon,
        settings: user.settings,
      });
    });
  } else {
    res.render("index.ejs", { loggedIn: false, settings: false });
  }
});

routes.get("/about", (req: Request, res: Response) => {
  res.render("about.ejs");
});

routes.get("/forgot", (req: Request, res: Response) => {
  res.render("forgot.ejs", { error: false });
});

routes.get("/resetPassword/:resetToken", (req: Request, res: Response) => {
  const token = req.params.resetToken;
  const tokenExists = verifyToken(token);
  if (!tokenExists)
    return res.render("error.ejs", { error: "Token is not valid!" });

  res.render("resetPassword.ejs", { token, error: false });
});

routes.get("/redeem", checkAuthenticated, (req: Request, res: Response) => {
  res.render("redeem.ejs", { error: false });
});

routes.get("/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) return console.log(err);

    // @ts-ignore shut up pwetty pwease
    req.session = null;
    req.logOut();
  });
  res.redirect("/login");
});

routes.get(["/terms", "/tos"], (req: Request, res: Response) => {
  res.render("terms.ejs");
});

routes.get(
  ["/policy", "/privacy", "/privacypolicy"],
  (req: Request, res: Response) => {
    res.render("privacy.ejs");
  }
);

// Social Medias
routes.get(["/discord", "/dis", "/dsc"], (req: Request, res: Response) =>
  res.redirect("https://discord.com/invite/cTm85eW49D")
);

routes.get(["/github", "/git", "/gh"], (req: Request, res: Response) =>
  res.redirect("https://github.com/imperialbin")
);

// Some posts for resetting your password
routes.post(
  "/requestResetPassword",
  checkNotAuthenticated,
  rateLimiter,
  (req: Request, res: Response) => {
    const email = req.body.email.toLowerCase();
    Users.findOne({ email }, (err: string, user: IUser) => {
      if (err)
        return res.render("forgot.ejs", {
          error: "An internal server error has occurred!",
        });

      if (!user)
        return res.render("forgot.ejs", {
          error: "We couldn't find a user with that email!",
        });

      const token = signToken(email);
      mail(
        email,
        "Reset password",
        "Hey there!",
        `Please click this link to reset your password! <br> https://www.imperialb.in/resetPassword/${token}`
      )
        .then(() => {
          res.render("success.ejs", {
            successMessage: `Please check your email at ${email}`,
          });
        })
        .catch((err) => {
          console.log(err);
          res.render("error.ejs", { error: "An unexpected error happened!" });
        });
    });
  }
);

routes.post("/resetPassword", async (req: Request, res: Response) => {
  const token = req.body.token;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;

  try {
    const getEmail = verifyToken(token);

    if (password.length < 8) throw "Your password must be 8 characters long!";
    if (password !== confirmPassword) throw "Passwords do not match!";

    const hashedPass = await hash(password, 13);
    await Users.updateOne(
      { email: getEmail },
      { $set: { password: hashedPass } }
    );

    res.render("success.ejs", {
      successMessage: "Successfully resetted your password!",
    });
  } catch (error) {
    return res.render("resetPassword.ejs", {
      token,
      error: "Invalid reset token or token has expired!",
    });
  }
});
