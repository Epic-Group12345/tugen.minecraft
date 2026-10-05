version       = "0.1.0"
author        = "Epic Group"
description   = "TUGEN launch module for Minecraft"
license       = "Proprietary"
srcDir        = "src"

requires "nim >= 2.2.0"
# Зависимость от tugen.core появится вместе с API модулей запуска

task test, "Тесты модуля":
  exec "nim r --hints:off tests/tminecraft.nim"
