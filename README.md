

# Context-free Grammars
The grammar module reads context-free grammars from file, and offers some methods that are practical for parsing.

The syntax of production rules is as follows (in EBNF):
```
grammar = { comment | production_rule }
production_rule = nonterminal, [ white_space ], "->", [ white_space ], nonterminal_seq
nonterminal_seq = nonterminal, { whitespace, nonterminal }
nonterminal = non_whitespace_char, { non_whitespace_char }
comment = "//", { any_character }
```
Terminals are not allowed in the grammar, because we assume these to recognised by a lexer and tagged with (lexical) categories. In the grammar these lexical categories can be seen as preterminals.


#Usage
A new grammar object is created as follows: 
```
var Grammar = require('./ContextFreeGrammar');
// Read a grammar from file
var dummy = new Grammar(grammar_file_path, callback(grammar) {
  // do something with the grammar
});
```
The constructor is asynchronous: a callback must be provided that will be called when reading the grammar is finished.

Methods of a grammar object are:
* <code>is_nonterminal(nt)</code>: checks if a symbol is a nonterminal
* rules_with_lhs(nt): returns all rules that have nt as left-hand-side
* start_rule(): returns the first production rule of the grammar; this is used by the Earley parser
* get_start_symbol(): returns the start symbol of the grammar; this is the left-hand-side nonterminal of the first production rule.
* get_rules_with_rhs(nt1, nt2): looks up all production rules of wich the right-hand-side consists of two nonterminals nt1 and nt2; this is used by the CYK parser.

# CYK Chart Parser
The CYK algorithm works with context-free grammars in Chomsky Normal Form (CNF). Production rules are of the form:
```
A -> B C
A -> a
```
where A, B and C are nonterminals and a is a terminal.
See http://en.wikipedia.org/wiki/CYK_algorithm for an explanation of the algorithm.

Below is a simple toy grammar that is in CNF:
```
S -> NP VP
NP -> DET N
NP -> NP PP
PP -> P NP
VP -> V NP
VP -> VP PP
DET -> the
NP -> I
N -> man
N -> telescope
P -> with
V -> saw
N -> cat
N -> dog
N -> pig
N -> hill
N -> park
N -> roof
P -> from
P -> on
P -> in
```
The language generated by this grammar contains a.o. "I saw the man with the telescope". Clearly, this grammar contains the lexicon as well. In our parser the lexicon is separated from the grammar. The parser expects a tokenized and tagged sentence as input. In this way we feed the output of a tagger into the parser.

## Usage
```
var CYK = require('./CYK');
var Grammar = require('./CFG');

// Read a grammar from file
var grammar = new Grammar(grammar_file_path);

// Create a parser
var parser = new CYK(grammar);
// Declare a tagged sentence. Format is taken from https://github.com/neopunisher/pos-js.
var tagged_sentence = [['I', 'NP'],
                       ['saw', 'V'],
                       ['the', 'DET'],
                       ['man', 'N'],
                       ['with', 'P'],
                       ['the', 'DET'],
                       ['telescope', 'N']];
// Parse a sentence
var chart = parser.parse(tagged_sentence);
```

## Developing
* Chomsky Normal Form allows rules of the form A -> *empty* as well. Such rules cannot be loaded and I don't know if the parser can handle these.

# Earley Chart Parser
The Earley Chart Parser can parse all context-free languages and uses arbitrary context-free grammars.
See http://en.wikipedia.org/wiki/Earley_parser for more information on the algorithm.

## Usage
The Earley parser takes a tagged sentence as argument. Example of a tagged sentence:
```
[['I', 'Pronoun'], ['saw', 'Verb'], ['the', 'Article'], ['man', 'Noun']]
```

And here is how to parse a sentence:
```
var EarleyChartParser = require('./EarleyChartParser');
var pos = require('pos');
var chart = EarleyChartParser.earley_parse(taggedWords);
```
The resulting chart is an array of length N+1, and each entry contains items of the form [rule, dot, from, children] where:
* rule is the production rule; it has two members: lhs for the left-hand-side of the rule, and rhs for the right-hand-side of the rule.
* dot is the position in the right hand side of the rule up to which it has been recognised. 
* from is the origin position pointing at the position in the sentence at which recognition of this rule began.
* children are the completed items that are used to recognise the current item

Based on the children of the completed items the parse(s) of a sentence can be constructed.
