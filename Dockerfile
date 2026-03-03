FROM node:22-alpine

# ARG so DO BUILD_TIME env var overrides this (ENV TARGET_DIR=X doesn't accept --build-arg)
ARG TARGET_DIR=smoke
ENV TARGET_DIR=${TARGET_DIR}

WORKDIR /app

COPY ${TARGET_DIR}/package.json ${TARGET_DIR}/package-lock.json ./

RUN npm install

COPY ${TARGET_DIR} .

RUN npm run build

# static site will be in /dist
# switch sketches by setting TARGET_DIR build-time env var in DO app spec.
