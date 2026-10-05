import std/unittest
import ../src/tugen_minecraft

suite "модуль":
  test "описание":
    check ModuleId == "minecraft"
    check ModuleName.len > 0
