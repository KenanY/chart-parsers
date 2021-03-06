/*
    Single dotted items for Earley and Left-Corner parsing
    Copyright (C) 2014 Hugo W.L. ter Doest

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var log4js = require('log4js');
var logger = log4js.getLogger();
logger.setLevel('ERROR');

// Creates an item; dot is an index in the RHS of the rule, 
// from is the starting point in the sentence
// Data structure is prepared for InfoVis
function EarleyItem(parameters) {
  // A unique identifier is constructed from rule, dot and from
  this.id = "Earley(" + parameters.rule.lhs + "->" + parameters.rule.rhs + ", " + parameters.dot + ", " + parameters.from + ", " + parameters.to +")";
  logger.debug("EarleyItem: " + this.id);
  this.name = parameters.rule.lhs;
  this.children = [];

  this.data = {};
  this.data.rule = parameters.rule;
  this.data.dot = parameters.dot;
  this.data.from = parameters.from;
  this.data.to = parameters.to;
}

module.exports = EarleyItem;

var ItemFactoryClass = require('./ItemFactory');
var itemFactory = new ItemFactoryClass();

EarleyItem.prototype.set_children = function(children) {
  logger.debug("Enter EarleyItem.set_children: " + children);
  this.children = children;
  logger.debug("Exit EarleyItem.set_children");
};

EarleyItem.prototype.append_child = function(child) {
  logger.debug("Enter EarleyItem.append_child: " + child);
  this.children.push(child);
  logger.debug("Exit EarleyItem.append_child");
};

// Checks if an item is incomplete
EarleyItem.prototype.is_incomplete = function () {
  logger.debug("EarleyItem.is_incomplete: " + this.id + (this.data.dot < this.data.rule.rhs.length));
  return(this.data.dot < this.data.rule.rhs.length);
};

// Checks if an item is complete
EarleyItem.prototype.is_complete = function () {
  logger.debug("EarleyItem.is complete: " + this.id + (this.data.dot === this.data.rule.rhs.length));
  return(this.data.dot === this.data.rule.rhs.length);
};

// Introduces new items for the next nonterminal to be recognised
EarleyItem.prototype.predictor = function(chart, grammar) { 
  var that = this;
  var nr_items_added = 0;

  logger.debug("EarleyItem.predictor: " + that.id);
  if (this.is_incomplete() && grammar.is_nonterminal(this.data.rule.rhs[this.data.dot])) {
    // Get all rules with lhs B
    var rules_with_lhs_B = grammar.rules_with_lhs(this.data.rule.rhs[this.data.dot]);
    // for each rule with LHS B create an item
    rules_with_lhs_B.forEach(function(rule) {
      //var newitem = new EarleyItem(rule, 0, that.data.to, that.data.to);
      var newitem = itemFactory.createItem({
        'type': 'Earley',
        'rule': rule,
        'dot': 0,
        'from': that.data.to,
        'to': that.data.to
      });
      nr_items_added += chart.add_item(newitem);
      logger.debug("EarleyItem.predictor: " + JSON.stringify(rule) + ", " + that.id + " |- " + newitem.id);
    });
  }
  logger.debug("EarleyItem.predictor: added " + nr_items_added + " items");
  // Return number of items added
  return(nr_items_added);
};

// LC method is based on the improved left-corner algorithm in 
// Improved Left-Corner Chart Parsing for Large Context-Free Grammars, Robert C. Moore
// IWPT2000
// Predictor based on rule 4a on page 5
EarleyItem.prototype.lc_predictor = function(chart, grammar) {
  that = this;
  var nr_items_added = 0;

  logger.debug("EarleyItem.lc_predictor: " + this.id);
  if (this.is_complete()) {
    // Get the productions rules that have the LHS of item as left-most daughter
    grammar.rules_with_leftmost_daughter(this.data.rule.lhs).forEach(function(rule) {
      // Get the items that end at the given item
      chart.get_items_to(that.data.from).forEach(function(item2) {
        if (item2.is_incomplete() && grammar.is_leftcorner_of(rule.lhs, item2.data.rule.rhs[item2.data.dot])) {
          //var newitem = new EarleyItem(rule, 1, that.data.from, that.data.to);
          var newitem = itemFactory.createItem({
            'type': 'Earley',
            'rule': rule,
            'dot': 1,
            'from': that.data.from,
            'to': that.data.to
          });
          newitem.append_child(that);
          nr_items_added += chart.add_item(newitem);
          logger.debug("EarleyItem.lc_predictor: " + JSON.stringify(rule) + ", " + that.id + ", " + item2.id + " |- " + newitem.id);
        }
      });
    });
  }
  logger.debug("EarleyItem.lc_predictor: added " + nr_items_added + " items");
  return(nr_items_added);
};

// item is complete
// Shifts the dot to the right for items in chart[k]
EarleyItem.prototype.completer = function(chart, grammar) {
  var that = this;
  var nr_items_added = 0;

  logger.debug("EarleyItem.completer: " + this.id);
  if (this.is_complete()) {
    var items = chart.get_items_to(this.data.from);
    items.forEach(function(item2) {
      if (item2.is_incomplete() && (that.data.rule.lhs === item2.data.rule.rhs[item2.data.dot])) {
        //var new_item = new EarleyItem(item2.data.rule, item2.data.dot + 1, item2.data.from, that.data.to);
        var new_item = itemFactory.createItem({
          'type': 'Earley',
          'rule': item2.data.rule,
          'dot': item2.data.dot + 1,
          'from': item2.data.from,
          'to': that.data.to
        });        
        // Make a copy of the children of item2, otherwise two items refer to the same set of children
        new_item.children = item2.children.slice();
        new_item.append_child(that);
        nr_items_added += chart.add_item(new_item);
        logger.debug("EarleyItem.completer: " + that.id + ", " + item2.id + " |- " + new_item.id);
      }
    });
  }
  logger.debug("EarleyItem.completer: added " + nr_items_added + " items");
  return(nr_items_added);
};

EarleyItem.prototype.create_parse_tree = function() {
  logger.debug("Enter EarleyItem.create_parse_tree: " + this.id);
  var subtree = this.data.rule.lhs;
  if (this.children.length === 0) {
    subtree += "(" + this.data.rule.rhs + ")";
  }
  else {
    subtree += "(";
    var i;
    for (i = 0; i < this.children.length; i++) {
      subtree +=  this.children[i].create_parse_tree() + (i < this.children.length - 1 ? "," : "");
    }
    subtree += ")";
  }
  logger.debug("Exit EarleyItem.create_parse_tree: " + subtree);
  return(subtree);
};

