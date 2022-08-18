; Identifier naming conventions

((identifier) @constructor
 (#match? @constructor "^[A-Z]"))

((identifier) @constant
 (#match? @constant "^[A-Z][A-Z_]*$"))

; Function definitions

(function_definition
  name: (identifier) @function)

; Variables

(identifier) @variable

; Literals

[
  (true)
  (false)
] @constant.builtin

[
  (integer)
  (float)
] @number

(comment) @comment
(string) @string
(escape_sequence) @escape

[
  "-"
  "~="
  "*"
  "^"
  "/"
  "\\"
  ".*"
  ".^"
  "./"
  ".\\"
  "&"
  "+"
  "<"
  "<="
  "="
  "=="
  ">"
  ">="
  "|"
  "~"
] @operator

[
  "break"
  "continue"
  "function"
  "elseif"
  "else"
  "for"
  "if"
  ; "try"
  "while"
  "case"
] @keyword
