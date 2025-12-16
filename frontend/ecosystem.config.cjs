module.exports = {
  apps: [{
    name: "frontend",
    script: "npx",
    args: "serve -s dist -l 8080",
    env: {
      NODE_ENV: "production"
    }
  }]
};
