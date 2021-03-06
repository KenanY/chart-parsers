/*
    DoubleDottedItem class
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

var typeOf = require('typeof');
var log4js = require('log4js');
var logger = log4js.getLogger();
logger.setLevel('ERROR');

var ItemFactoryClass = require('./ItemFactory');
var itemFactory = new ItemFactoryClass();

// Creates a doubledotted item; 
// left_dot is an index in the RHS of the rule as well as right_dot
// from is the starting point in the sentence
// Data structure is prepared for use with InfoVis
function DoubleDottedItem(parameters) {
  // An identifier is constructed from rule, dots, from and to
  this.id = "DoubleDottedItem(" + parameters.rule.lhs + "->" + 
    parameters.rule.rhs + ", " + parameters.left_dot + ", " + 
    parameters.right_dot + ", " + parameters.from + ", " + parameters.to +")";
  logger.debug("Enter DoubleDottedItem: " + this.id);
  this.name = parameters.rule.lhs;
  this.children = [];

  this.data = {};
  this.data.rule = parameters.rule;
  this.data.left_dot = parameters.left_dot;
  this.data.right_dot = parameters.right_dot;
  this.data.from = parameters.from;
  this.data.to = parameters.to;
  logger.debug("Exit DoubleDottedItem: created item: " + this.id);
}

// Check whether this can be replaced by clone (i.e. shallow copy)
DoubleDottedItem.prototype.copy = function () {
  logger.debug("Enter DoubleDottedItem.copy(): " + this.id);
  //var new_item = new DoubleDottedItem(this.data.rule, this.data.left_dot, this.data.right_dot, this.data.from, this.data.to);
  var new_item = itemFactory.createItem({
    'type': 'DoubleDotted',
    'rule': this.data.rule, 
    'left_dot': this.data.left_dot,
    'right_dot': this.data.right_dot,
    'from': this.data.from,
    'to': this.data.to
  });
  new_item.children = this.children.slice();
  logger.debug("Exit DoubleDottedItem.copy: " + new_item.id);
  return(new_item);
};

DoubleDottedItem.prototype.recognise_left = function(cyk_item) {
  logger.debug("Enter " + this.id + ".recognise_left(" + cyk_item.id + ")");
  this.data.left_dot--;
  this.data.from = cyk_item.data.from;
  this.children.unshift(cyk_item);
  this.id = "DoubleDottedItem(" + this.data.rule.lhs + "->" + this.data.rule.rhs + ", " + 
            this.data.left_dot + ", " + this.data.right_dot + ", " + this.data.from + ", " + this.data.to +")";
  logger.debug("Exit DoubleDottedItem.recognise_left: " + this.id);
};

DoubleDottedItem.prototype.recognise_right = function(cyk_item) {
  logger.debug("Enter " + this.id + ".recognise_right(" + cyk_item.id + ")");
  this.data.right_dot++;
  this.data.to = cyk_item.data.to;
  this.children.push(cyk_item);
  this.id = "DoubleDottedItem(" + this.data.rule.lhs + "->" + this.data.rule.rhs + ", " + 
            this.data.left_dot + ", " + this.data.right_dot + ", " + this.data.from + ", " + this.data.to +")";
  logger.debug("Exit DoubleDottedItem.recognise_right: " + this.id);
};

// Checks if an item is incomplete
DoubleDottedItem.prototype.is_incomplete = function () {
  return(!this.is_complete());
};

// Checks if an item is complete
DoubleDottedItem.prototype.is_complete = function () {
  return((this.data.left_dot === 0) && (this.data.right_dot === this.data.rule.rhs.length));
};

DoubleDottedItem.prototype.combine_with_chart = function(chart, agenda, grammar) {
  var nr_items_added = 0;
  
  logger.debug("Enter DoubleDottedItem.combine_with_chart:" + this.id);
  nr_items_added += this.pre_complete(chart, agenda, grammar);
  nr_items_added += this.left_predict(chart, agenda, grammar);
  nr_items_added += this.right_predict(chart, agenda, grammar);
  nr_items_added += this.left_complete(chart, agenda, grammar);
  nr_items_added += this.right_complete(chart, agenda, grammar);
  logger.debug("Exit DoubleDottedItem.combine_with_chart: number of items added: " + nr_items_added);
};

DoubleDottedItem.prototype.pre_complete = function (chart, agenda, grammar) {
  var nr_items_added = 0;

  logger.debug("Enter DoubleDottedItem.pre_complete:" + this.id);
  if (this.is_complete()) {
    //var new_item = new CYK_Item(this.data.rule, this.data.from, this.data.to);
    var new_item = itemFactory.createItem({
      'type': 'CYK',
      'rule': this.data.rule, 
      'from': this.data.from, 
      'to': this.data.to
    });
    new_item.children = this.children.slice();
    nr_items_added += agenda.add_item(new_item, chart);
    logger.debug("DoubleDottedItem.pre_complete: " + this.id + " |- " + new_item.id);
  }
  logger.debug("Exit DoubleDottedItem.pre_complete: number of items added: " + nr_items_added);
  return(nr_items_added);
};

DoubleDottedItem.prototype.left_predict = function (chart, agenda, grammar) {
  var that = this;
  var nr_items_added = 0;

  logger.debug("Enter DoubleDottedItem.left_predict:" + this.id);
  if (this.data.left_dot > 0) {
    // Get goal items that end at the "to" of the current item
    var items = chart.get_items_to(this.data.to);
    items.forEach(function(item) {
      if (typeOf(item) === "goalitem") { // try to combine with the current item
        if (grammar.is_headcorner_of(that.data.rule.lhs, item.nonterminal)) {
          for (var i = item.data.from; i <= that.data.from; i++) {
            for (var j = i; j <= that.data.from; j++) {
              //var new_goal = new GoalItem(i, j, that.data.rule.rhs[that.data.left_dot-1]);
              var new_goal = itemFactory({
                'type': 'Goal',
                'nonterminal': that.data.rule.rhs[that.data.left_dot-1],
                'from': i,
                'to': j
              });
              nr_items_added += agenda.add_item(new_goal, chart);
              logger.debug("DoubleDottedItem.left_predict: " + item.id + ", " + that.id + " |- " + new_goal.id);
            }
          }
        }
      }
    });
  }
  logger.debug("Exit DoubleDottedItem.left_predict: number of items added: " + nr_items_added);
  return(nr_items_added);
};

DoubleDottedItem.prototype.right_predict = function (chart, agenda, grammar) {
  var that = this;
  var nr_items_added = 0;

  logger.debug("Enter DoubleDottedItem.right_predict:" + this.id);
  if (this.data.right_dot < this.data.rule.rhs.length) {
    // Get goal items that start at the "from" of the current item
    var items = chart.get_items_from(this.data.from);
    items.forEach(function(item) {
      if (typeOf(item) === "goalitem") { // try to combine with the current item
        if (grammar.is_headcorner_of(that.data.rule.lhs, item.data.nonterminal)) {
          for (var j = that.data.to; j <= item.data.to; j++) {
            for (var k = j; k <= item.data.to; k++) {
              //var new_goal = new GoalItem(j, k, that.data.rule.rhs[that.data.right_dot]);
              var new_goal = itemFactory.createItem({
                'type': 'Goal',
                'nonterminal': that.data.rule.rhs[that.data.right_dot],
                'from': j,
                'to': k
              });
              nr_items_added += agenda.add_item(new_goal, chart);
              logger.debug("DoubleDottedItem.right_predict: " + item.id + ", " + that.id + " |- " + new_goal.id);
            }
          }
        }
      }
    });
  }
  logger.debug("Exit DoubleDottedItem.right_predict: number of items added: " + nr_items_added);
  return(nr_items_added);
};

DoubleDottedItem.prototype.left_complete = function (chart, agenda, grammar) {
  var that = this;
  var nr_items_added = 0;

  logger.debug("Enter DoubleDottedItem.left_complete:" + this.id);
  if  (this.data.left_dot > 0) {
    // Get goal items that end at the "to" of the current item
    var items1 = chart.get_items_to(this.data.to);
    items1.forEach(function(item1) {
      if (typeOf(item1) === "goalitem") { 
        // find completed items to combine with
        var items2 = chart.get_items_from_to(item1.data.from, that.data.from);
        items2.forEach(function(item2) {
          if ((typeOf(item2) === "cyk_item") &&
              (that.data.rule.rhs[that.data.left_dot-1] === item2.data.rule.lhs) &&
              grammar.is_headcorner_of(that.data.rule.lhs, item1.data.nonterminal)) {
            var new_item = that.copy();
            new_item.recognise_left(item2);
            nr_items_added += agenda.add_item(new_item, chart);
            logger.debug("DoubleDottedItem.left_complete: " + item1.id +", " + item2.id + ", " + that.id + " |- " + new_item.id);
          }
        });
      }
    });
  }
  logger.debug("Exit DoubleDottedItem.left_complete: number of items added: " + nr_items_added);
  return(nr_items_added);
};

DoubleDottedItem.prototype.right_complete = function (chart, agenda, grammar) {
  var that = this;
  var nr_items_added = 0;

  logger.debug("Enter DoubleDottedItem.right_complete:" + this.id);
  if (this.data.right_dot < this.data.rule.rhs.length) {
    // Get goal items that start at the "from" of the current item
    var items1 = chart.get_items_from(this.data.from);
    items1.forEach(function(item1) {
      if (typeOf(item1) === "goalitem") { 
        // find completed items to combine with
        var items2 = chart.get_items_from_to(that.data.to, item1.data.to);
        items2.forEach(function(item2) {
          if (typeOf(item2) === "cyk_item") {
            if ((that.data.rule.rhs[that.data.right_dot] === item2.data.rule.lhs) &&
                grammar.is_headcorner_of(that.data.rule.lhs, item1.data.nonterminal)) {
              new_item = that.copy();
              new_item.recognise_right(item2);
              nr_items_added += agenda.add_item(new_item, chart);
              logger.debug("DoubleDottedItem.right_complete: " + item1.id +", " + that.id + ", " + item2.id + " |- " + new_item.id);
            }
          }
        });
      }
    });
  }
  logger.debug("Exit DoubleDottedItem.right_complete: number of items added: " + nr_items_added);
  return(nr_items_added);
};

module.exports = DoubleDottedItem;
