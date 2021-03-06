# Buildpack for Arduino based projects

[![Build Status](https://travis-ci.org/spark/buildpack-wiring-preprocessor.svg?branch=master)](https://travis-ci.org/spark/buildpack-wiring-preprocessor) [![](https://imagelayers.io/badge/particle/buildpack-wiring-preprocessor:latest.svg)](https://imagelayers.io/?images=particle/buildpack-wiring-preprocessor:latest 'Get your own badge on imagelayers.io')


This buildpack preprocesses `.ino` files into `.cpp`.
It inherits [base buildpack](https://github.com/spark/buildpack-base).

This behavior can be disabled adding `#pragma SPARK_NO_PREPROCESSOR` to Arduino file.

## Building image

**Before building this image, build or fetch [buildpack-base](https://github.com/spark/buildpack-base).**

```bash
$ export BUILDPACK_IMAGE=wiring-preprocessor
$ git clone "git@github.com:spark/buildpack-${BUILDPACK_IMAGE}.git"
$ cd buildpack-$BUILDPACK_IMAGE
$ docker build -t particle/buildpack-$BUILDPACK_IMAGE .
```

## Running

This buildpack requires two volumes to be mounted: `/input` and `/output`. To preprocess code simply run the container:

```bash
$ docker run --rm \
  -v ~/tmp/input:/input \
  -v ~/tmp/output:/output \
  particle/buildpack-wiring-preprocessor
```

Where `~/tmp/input` is location of Wiring code and `~/tmp/output` is where preprocessed code will be stored.
