#!/usr/bin/env sh
if [ -z "$husky_skip_init" ]; then
  husky_skip_init=1
  export husky_skip_init

  if [ -f "$HOME/.huskyrc" ]; then
    . "$HOME/.huskyrc"
  fi
fi
