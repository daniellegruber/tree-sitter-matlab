const PREC = {
 
    conditional: -1,

    /*logical_or: 10,
    logical_and: 11,
    //not: 12,
    compare: 13,
    bitwise_or: 14,
    bitwise_and: 15,
    //logical_or: 16,
    //logical_and: 17,
    plus: 18,
    times: 19,
    unary: 20,
    power: 21,
    call: 22,*/

    // https://www.mathworks.com/help/matlab/matlab_prog/operator-precedence.html
    logical_or: 10,
    logical_and: 11,
    bitwise_or: 12,
    bitwise_and: 13,
    compare: 14,
    slice:15,
    plus: 16,
    times: 17,
    unary: 18,
    transpose: 19,
    power: 20,
    call: 21,
    
}

const SEMICOLON = ';'

module.exports = grammar({
    name: 'matlab',

    extras: $ => [
        $.comment,
        /[\s\f\uFEFF\u2060\u200B]|\\\r?\n/
      ],

    /*conflicts: $ => [
        [$.argument_list, $.subscript]
      ],*/

    supertypes: $ => [
        $._simple_statement,
        $._compound_statement,
        $.expression,
        $.primary_expression,
        $.parameter,
    ],

    externals: $ => [
    $._newline,
    $._indent,
    $._dedent,
    $._string_start,
    $._string_content,
    $._string_end,

    // Mark comments as external tokens so that the external scanner is always
    // invoked, even if no external token is expected. This allows for better
    // error recovery, because the external scanner can maintain the overall
    // structure by returning dedent tokens whenever a dedent occurs, even
    // if no dedent is expected.
    $.comment,

    // Allow the external scanner to check for the validity of closing brackets
    // so that it can avoid returning dedent tokens between brackets.
    ']',
    ')',
    '}',
  ],

  inline: $ => [
    $._simple_statement,
    $._compound_statement,
    $._suite,
    $._expressions,
    $._left_hand_side,
  ],

  word: $ => $.identifier,


  rules: {
    module: $ => repeat($._statement),

    _statement: $ => choice(
      $._simple_statements,
      $._compound_statement
    ),

    // Simple statements

    _simple_statements: $ => seq(
      sep1($._simple_statement, ';'),
      optional(';'),
      $._newline
    ),

    _simple_statement: $ => choice(
      $.expression_statement,
      $.break_statement,
      $.continue_statement,
    ),

    expression_statement: $ => prec.left(choice(
      $.expression,
      seq(sep1($.expression, ','), optional(',')),
      $.assignment,
    )),

    _expressions: $ => choice(
      $.expression,
      $.expression_list
    ),

    break_statement: $ => prec.left('break'),
    continue_statement: $ => prec.left('continue'),

    // Compound statements

    _compound_statement: $ => choice(
      $.if_statement,
      $.for_statement,
      $.while_statement,
      $.try_statement,
      $.function_definition,
    ),

    if_statement: $ => seq(
      'if',
      field('condition', $.expression),
      field('consequence', $._suite),
      repeat(field('alternative', $.elseif_clause)),
      optional(field('alternative', $.else_clause)),
      'end'
    ),

    elseif_clause: $ => seq(
      'elseif',
      field('condition', $.expression),
      field('consequence', $._suite)
    ),

    else_clause: $ => seq(
      'else',
      field('body', $._suite)
    ),

    case_clause: $ => seq(
      'case',
      field('condition', $.expression),
      field('consequence', $._suite)
    ),

    for_statement: $ => seq(
      'for',
      field('left', $._left_hand_side),
      '=',
      field('right', choice($.expression, $.slice)),
      field('body', $._suite),
      'end'
    ),

    while_statement: $ => seq(
      'while',
      field('condition', $.expression),
      field('body', $._suite),
      optional(field('alternative', $.else_clause)),
      'end'
    ),

    try_statement: $ => seq(
      'try',
      field('body', $._suite),
      optional($.catch_clause),
      'end'
    ),

    catch_clause: $ => seq(
      'catch',
      optional(field('exception', $.expression)),
      field('body',$._suite)
    ),
    

    function_definition: $ => prec.left(seq(
      'function',
      optional(seq(field('return_variable', $.return_value), '=')),
      field('name', $.identifier),
      field('parameters', $.parameters),
      field('body', $._suite),
      'end'
    )),

    parameters: $ => seq(
      '(',
      optional($._parameters),
      ')'
    ),

    /*argument_list: $ => seq(
      '(',
      optional(sep1($.expression, ',')),
      optional(','),
      ')'
    ),*/

    _suite: $ => choice(
      alias($._simple_statements, $.block),
      seq($._indent, $.block),
      alias($._newline, $.block)
    ),

    block: $ => seq(
      repeat($._statement),
      $._dedent
    ),

    return_value: ($) =>
      choice(
        $.identifier,
        //seq('[', sep1($.identifier, ','), ']')
        $.matrix
      ),

    expression_list: $ => prec.right(seq(
      $.expression,
      choice(
        ',',
        seq(
          repeat1(seq(
            ',',
            $.expression
          )),
          optional(',')
        ),
      )
    )),

    // Patterns

    _parameters: $ => seq(
      sep1($.parameter, ','),
      optional(',')
    ),

    parameter: $ => $.identifier,

    // Expressions

    expression: $ => choice(
      $.comparison_operator,
      //$.not_operator,
      $.boolean_operator,
      $.primary_expression,
      $.conditional_expression
    ),

    primary_expression: $ => prec.left(choice(
      $.binary_operator,
      $.identifier,
      $.string,
      //$.concatenated_string,
      $.integer,
      $.float,
      $.true,
      $.false,
      //$.none,
      $.unary_operator,
      $.transpose_operator,
      $.call_or_subscript,
      //$.call,
      $.ellipsis,
      $.matrix,
      $.cell,
      $.keyword,
      $.complex
    )),

    boolean_operator: $ => choice(
      prec.left(PREC.bitwise_and, seq(
        field('left', $.expression),
        field('operator', '&'),
        field('right', $.expression)
      )),
      prec.left(PREC.bitwise_or, seq(
        field('left', $.expression),
        field('operator', '|'),
        field('right', $.expression)
      )),
      prec.left(PREC.logical_and, seq(
        field('left', $.expression),
        field('operator', '&&'),
        field('right', $.expression)
      )),
      prec.left(PREC.logical_or, seq(
        field('left', $.expression),
        field('operator', '||'),
        field('right', $.expression)
      ))
    ),

    binary_operator: $ => {
        const table = [
        [prec.left, '+', PREC.plus],
        [prec.left, '-', PREC.plus],
        [prec.left, '*', PREC.times],
        [prec.left, '/', PREC.times],
        [prec.left, '\\', PREC.times],
        [prec.right, '^', PREC.power],
        [prec.left, '.*', PREC.times],
        [prec.left, './', PREC.times],
        [prec.left, '.\\', PREC.times],
        [prec.right, '.^', PREC.power],
    ];

    return choice(...table.map(([fn, operator, precedence]) => fn(precedence, seq(
        field('left', $.primary_expression),
        field('operator', operator),
        field('right', $.primary_expression)
      ))));
    },

    unary_operator: $ => prec(PREC.unary, seq(
      field('operator', choice('+', '-', '~')),
      field('argument', $.primary_expression)
    )),

    transpose_operator: $ => prec(PREC.transpose, 
        seq(
            field('argument', $.primary_expression),
            field('operator', choice('\'', '.\''))
    )),

    /*comparison_operator: $ => prec.left(PREC.compare, seq(
      $.primary_expression,
      repeat1(seq(
        field('operators',
          choice(
            '<',
            '<=',
            '==',
            '~=',
            '>=',
            '>',
          )),
        $.primary_expression
      ))
    )),*/

    comparison_operator: $ => prec.left(PREC.compare, seq(
        field('left', $.expression),
        field('operator', choice(
            '<',
            '<=',
            '==',
            '~=',
            '>=',
            '>',
          )),
        field('right', $.expression)
      )),

     assignment: $ => seq(
      field('left', $._left_hand_side),
      '=',
      field('right', $.expression)
     ),

    _left_hand_side: $ => choice(
      $.call_or_subscript,
      $.identifier,
    ),

    call_or_subscript: $ => prec(PREC.call, seq(
      field('value', $.primary_expression),
      '(',
      sep1(field('args_or_subscript', optional(choice($.expression, $.slice))),','),
      optional(','),
      ')'
    )),


    slice: $ => prec.left(PREC.slice, seq(
      $.expression, 
      ':', 
      $.expression,
      optional(seq(':', $.expression))
    )),

    ellipsis: $ => '...',

    /* Determine if function call while traversing tree since 
    hard to distinguish between subscript and call */
    /*call: $ => prec(PREC.call, seq(
      field('function', $.primary_expression),
      field('arguments', $.argument_list)
    )),*/

    type: $ => $.expression,

    // Literals

    matrix: ($) => seq(
        '[',
        repeat(seq(
            choice($.expression, $.slice),
            optional(choice(',', ';')))),
        ']'
    ),
    
    cell: ($) => seq(
        '{',
        repeat(seq(
            choice($.expression, $.slice),
            optional(choice(',', ';')))),
        '}'
    ),

    for_in_clause: $ => prec.left(seq(
      'for',
      field('left', $._left_hand_side),
      '=',
      field('right', choice($.expression, $.slice)),
      optional(',')
    )),

    if_clause: $ => seq(
      'if',
      $.expression
    ),

    conditional_expression: $ => prec.right(PREC.conditional, seq(
      $.expression,
      'if',
      $.expression,
      'else',
      $.expression
    )),


    string: $ => choice(
      seq(
        '"',
        repeat(choice(
          alias($.unescaped_double_string_fragment, $.string_fragment),
          $.escape_sequence
        )),
        '"'
      ),
      seq(
        "'",
        repeat(choice(
          alias($.unescaped_single_string_fragment, $.string_fragment),
          $.escape_sequence
        )),
        "'"
      )
    ),

    unescaped_double_string_fragment: $ =>
      token.immediate(prec(1, /[^"\\]+/)),

    unescaped_single_string_fragment: $ =>
      token.immediate(prec(1, /[^'\\]+/)),

    escape_sequence: $ => token.immediate(seq(
      '\\',
      choice(
        /[^xu0-7]/,
        /[0-7]{1,3}/,
        /x[0-9a-fA-F]{2}/,
        /u[0-9a-fA-F]{4}/,
        /u{[0-9a-fA-F]+}/
      )
    )),

    integer: $ => token(choice(
      seq(
        choice('0x', '0X'),
        repeat1(/_?[A-Fa-f0-9]+/)
      ),
      seq(
        choice('0b', '0B'),
        repeat1(/_?[0-1]+/)
      ),
      seq(
        repeat1(/[0-9]+_?/)
      )
    )),

    float: $ => {
      const digits = repeat1(/[0-9]+_?/);
      const exponent = seq(/[eE][\+-]?/, digits)

      return token(seq(
        choice(
          seq(digits, '.', optional(digits), optional(exponent)),
          seq(optional(digits), '.', digits, optional(exponent)),
          seq(digits, exponent)
        )
      ))
    },

    complex: $ => seq(
        /*optional(seq(
            choice($.integer, $.float), 
            $.binary_operator)),*/
        seq(choice($.integer, $.float), choice('i','j'))
    ),

    identifier: $ => /[_\p{XID_Start}][_\p{XID_Continue}]*/,

    true: $ => 'true',
    false: $ => 'false',
    //none: $ => 'None',

    keyword: $ => prec(-3, 
        'end',
    ),
    
    comment: $ => token(choice(
      seq('%', /.*/),
      seq(
        '%{',
        /[^*]*%+([^%][^*]*%+)*/,
        '}'
      )
    )),

  }
})

function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)))
}