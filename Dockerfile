FROM node:22-alpine


# how to load this from env file
ENV TARGET_DIR=${TARGET_DIR:-sketchy}

WORKDIR /app

COPY $TARGET_DIR/package.json $TARGET_DIR/package-lock.json ./

RUN npm install

COPY $TARGET_DIR .

RUN npm run build

# static site will be in /dist

# todo: use config file to point to subfolder to build from. or some kind of thing like this.
# app platform will use this dockerfile to deploy.