/*! ProfileGraphics - Travis Gillin */
;(function (global) {

    // Compiler directive for UglifyJS.  See PartTree.const.js for more info.
    if (typeof DEBUG === 'undefined') {
      DEBUG = true;
    }
    
    
    // PartTree-GLOBAL CONSTANTS
    //
    // These constants are exposed to all PartTree modules.
    
    
    // GLOBAL is a reference to the global Object.
    var Fn = Function, GLOBAL = new Fn('return this')();
    
    
    // PartTree-GLOBAL METHODS
    //
    // The methods here are exposed to all PartTree modules.  Because all of the
    // source files are wrapped within a closure at build time, they are not
    // exposed globally in the distributable binaries.
    
    
    /**
     * A no-op function.  Useful for passing around as a default callback.
     */
    function noop () { }
    
    
    /**
     * Init wrapper for the core module.
     * @param {Object} The Object that the PartTree gets attached to in
     * PartTree.init.js.  If the PartTree was not loaded with an AMD loader such as
     * require.js, this is the global Object.
     */
    function initPartTreeCore (context) {
    
    
      // It is recommended to use strict mode to help make mistakes easier to find.
      'use strict';
    
    
      // PRIVATE MODULE CONSTANTS
      //
    
    
      // An example of a CONSTANT variable;
      var CORE_CONSTANT = true;
    
    
      // PRIVATE MODULE METHODS
      //
      // These do not get attached to a prototype.  They are private utility
      // functions.
    
    
      /**
       *  An example of a private method.  Feel free to remove this.
       *  @param {number} aNumber This is a parameter description.
       *  @returns {number} This is a return value description.
       */
      function corePrivateMethod (aNumber) {
        return aNumber;
      }
    
    
      /**
       * This is the constructor for the PartTree Object.  Please rename it to
       * whatever your PartTree's name is.  Note that the constructor is also being
       * attached to the context that the PartTree was loaded in.
       * @param {Object} opt_config Contains any properties that should be used to
       * configure this instance of the PartTree.
       * @constructor
       */
      var PartTree = context.PartTree = function (opt_config) {
    
        opt_config = opt_config || {};
    
        // INSTANCE PROPERTY SETUP
        //
        // Your PartTree likely has some instance-specific properties.  The value of
        // these properties can depend on any number of things, such as properties
        // passed in via opt_config or global state.  Whatever the case, the values
        // should be set in this constructor.
    
        // Instance variables that have a leading underscore mean that they should
        // not be modified outside of the PartTree.  They can be freely modified
        // internally, however.  If an instance variable will likely be accessed
        // outside of the PartTree, consider making a public getter function for it.
        //this._readOnlyVar = 'read only';
    
        /* External Library Dependancies */
    

        /* This stack stores all parts and subparts */
        this.Stack = [];
        this.Element = null;
        
        return this;
      };
    
    
    // PartTree PROTOTYPE METHODS
    //
    // These methods define the public API.
    /**
    * Return a copy of an object that arn't linked
    * @return {object}
    */
    PartTree.prototype.copy_obj = function (obj) {
        return JSON.parse(JSON.stringify(obj));
    };
    /**
    * Return a copy of an object that arn't linked
    * @return {object}
    */
    PartTree.prototype.init = function (selector) {
        this.Element = document.getElementById(selector);
        return;
    };
    /**
    * Return a copy of an object that arn't linked
    * @return {object}
    */
    PartTree.prototype.add_parent_part = function (name, options) {
        var newNode = document.createElement('div');
        //newNode.id = 'block';
        newNode.className = 'tree_parent';

        var arrow = document.createElement('i');
        arrow.className = "fas fa-arrow-right part_arrow";
        arrow.onclick = function()
        {
            //console.log("Clicked on arrow!");
            this.classList.toggle("fa-arrow-right");
            this.classList.toggle("fa-arrow-down");
            var child_div = this.parentElement.getElementsByTagName('div')[0];
            child_div.classList.toggle("tree_child_show");
            child_div.classList.toggle("tree_child_hide");
        };
        newNode.appendChild(arrow);

        var lightbulb = document.createElement('i');
        lightbulb.className = "fas fa-lightbulb part_lightbulb_on";
        lightbulb.onclick = function()
        {
            //console.log("Clicked on light bulb!");
            this.classList.toggle("part_lightbulb_on");
            this.classList.toggle("part_lightbulb_off");
            if (options.parent_lightbulb_toggle != null)
            {
                options.parent_lightbulb_toggle();
            }
        };
        newNode.appendChild(lightbulb);

        var partname = document.createElement('i');
        partname.className = "part_text";
        partname.innerHTML = name;
        partname.onclick = function()
        {
            console.log("Clicked on part name");
        }
        newNode.appendChild(partname);

        var treeChild = document.createElement('div');
        /*treeChild.className = 'tree_child_hide';
        var child_lightbulb = document.createElement('i');
        child_lightbulb.className = "fas fa-lightbulb part_lightbulb_on";
        treeChild.appendChild(child_lightbulb);
        var tree_partname = document.createElement('i');
        tree_partname.className = "part_text";
        tree_partname.innerHTML = "Test";
        treeChild.appendChild(tree_partname)*/
        newNode.appendChild(treeChild);

        this.Element.appendChild(newNode);
        return;
    };
    /**
    * This is an example of a chainable method.  That means that the return
    * value of this function is the PartTree instance itself (`this`).  This lets
    * you do chained method calls like this:
    *
    * var myPartTree = new PartTree();
    * myPartTree
    *   .chainableMethod()
    *   .chainableMethod();
    *
    * @return {PartTree}
    */
    PartTree.prototype.chainableMethod = function () {
        return this;
    };
    
    
      // DEBUG CODE
      //
      // With compiler directives, you can wrap code in a conditional check to
      // ensure that it does not get included in the compiled binaries.  This is
      // useful for exposing certain properties and methods that are needed during
      // development and testing, but should be private in the compiled binaries.
    
    
      if (DEBUG) {
        GLOBAL.corePrivateMethod = corePrivateMethod;
      }
    
    }
    
    // Your PartTree may have many modules.  How you organize the modules is up to
    // you, but generally speaking it's best if each module addresses a specific
    // concern.  No module should need to know about the implementation details of
    // any other module.
    
    // Note:  You must name this function something unique.  If you end up
    // copy/pasting this file, the last function defined will clobber the previous
    // one.
    function initPartTreeModule (context) {
    
      'use strict';
    
      var PartTree = context.PartTree;
    
    
      // A PartTree module can do two things to the PartTree Object:  It can extend
      // the prototype to add more methods, and it can add static properties.  This
      // is useful if your PartTree needs helper methods.
    
    
      // PRIVATE MODULE CONSTANTS
      //
    
    
      var MODULE_CONSTANT = true;
    
    
      // PRIVATE MODULE METHODS
      //
    
    
      /**
       *  An example of a private method.  Feel free to remove this.
       */
      function modulePrivateMethod () {
        return;
      }
    
    
      // PartTree STATIC PROPERTIES
      //
    
    
      /**
       * An example of a static PartTree property.  This particular static property
       * is also an instantiable Object.
       * @constructor
       */
      PartTree.PartTreeHelper = function () {
        return this;
      };
    
    
      // PartTree PROTOTYPE EXTENSIONS
      //
      // A module can extend the prototype of the PartTree Object.
    
    
      /**
       * An example of a prototype method.
       * @return {string}
       */
      PartTree.prototype.alternateGetReadOnlyVar = function () {
        // Note that a module can access all of the PartTree instance variables with
        // the `this` keyword.
        return this._readOnlyVar;
      };
    
    
      if (DEBUG) {
        // DEBUG CODE
        //
        // Each module can have its own debugging section.  They all get compiled
        // out of the binary.
      }
    
    }
    
    /*global initPartTreeCore initPartTreeModule */
    var initPartTree = function (context) {
    
      initPartTreeCore(context);
      initPartTreeModule(context);
      // Add a similar line as above for each module that you have.  If you have a
      // module named "Awesome Module," it should live in the file
      // "src/PartTree.awesome-module.js" with a wrapper function named
      // "initAwesomeModule".  That function should then be invoked here with:
      //
      // initAwesomeModule(context);
    
      return context.PartTree;
    };
    
    
    if (typeof define === 'function' && define.amd) {
      // Expose PartTree as an AMD module if it's loaded with RequireJS or
      // similar.
      define(function () {
        return initPartTree({});
      });
    } else {
      // Load PartTree normally (creating a PartTree global) if not using an AMD
      // loader.
      initPartTree(this);
    }
    
    } (this));
    