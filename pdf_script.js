/**
 * @license AngularJS v1.6.8
 * (c) 2010-2017 Google, Inc. http://angularjs.org
 * License: MIT
 */

(function (window, angular) {
    "use strict";
  
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *     Any commits to this file should be reviewed with security in mind.  *
     *   Changes to this file can potentially create security vulnerabilities. *
     *          An approval from 2 Core members with history of modifying      *
     *                         this file is required.                          *
     *                                                                         *
     *  Does the change somehow allow for arbitrary javascript to be executed? *
     *    Or allows for someone to change the prototype of built-in objects?   *
     *     Or gives undesired access to variables likes document or window?    *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
  
    var $sanitizeMinErr = angular.$$minErr("$sanitize");
    var bind;
    var extend;
    var forEach;
    var isDefined;
    var lowercase;
    var noop;
    var nodeContains;
    var htmlParser;
    var htmlSanitizeWriter;
  
    /**
     * @ngdoc module
     * @name ngSanitize
     * @description
     *
     * The `ngSanitize` module provides functionality to sanitize HTML.
     *
     * See {@link ngSanitize.$sanitize `$sanitize`} for usage.
     */
  
    /**
   * @ngdoc service
   * @name $sanitize
   * @kind function
   *
   * @description
   *   Sanitizes an html string by stripping all potentially dangerous tokens.
   *
   *   The input is sanitized by parsing the HTML into tokens. All safe tokens (from a whitelist) are
   *   then serialized back to properly escaped html string. This means that no unsafe input can make
   *   it into the returned string.
   *
   *   The whitelist for URL sanitization of attribute values is configured using the functions
   *   `aHrefSanitizationWhitelist` and `imgSrcSanitizationWhitelist` of {@link ng.$compileProvider
   *   `$compileProvider`}.
   *
   *   The input may also contain SVG markup if this is enabled via {@link $sanitizeProvider}.
   *
   * @param {string} html HTML input.
   * @returns {string} Sanitized HTML.
   *
   * @example
     <example module="sanitizeExample" deps="angular-sanitize.js" name="sanitize-service">
     <file name="index.html">
       <script>
           angular.module('sanitizeExample', ['ngSanitize'])
             .controller('ExampleController', ['$scope', '$sce', function($scope, $sce) {
               $scope.snippet =
                 '<p style="color:blue">an html\n' +
                 '<em onmouseover="this.textContent=\'PWN3D!\'">click here</em>\n' +
                 'snippet</p>';
               $scope.deliberatelyTrustDangerousSnippet = function() {
                 return $sce.trustAsHtml($scope.snippet);
               };
             }]);
       </script>
       <div ng-controller="ExampleController">
          Snippet: <textarea ng-model="snippet" cols="60" rows="3"></textarea>
         <table>
           <tr>
             <td>Directive</td>
             <td>How</td>
             <td>Source</td>
             <td>Rendered</td>
           </tr>
           <tr id="bind-html-with-sanitize">
             <td>ng-bind-html</td>
             <td>Automatically uses $sanitize</td>
             <td><pre>&lt;div ng-bind-html="snippet"&gt;<br/>&lt;/div&gt;</pre></td>
             <td><div ng-bind-html="snippet"></div></td>
           </tr>
           <tr id="bind-html-with-trust">
             <td>ng-bind-html</td>
             <td>Bypass $sanitize by explicitly trusting the dangerous value</td>
             <td>
             <pre>&lt;div ng-bind-html="deliberatelyTrustDangerousSnippet()"&gt;
  &lt;/div&gt;</pre>
             </td>
             <td><div ng-bind-html="deliberatelyTrustDangerousSnippet()"></div></td>
           </tr>
           <tr id="bind-default">
             <td>ng-bind</td>
             <td>Automatically escapes</td>
             <td><pre>&lt;div ng-bind="snippet"&gt;<br/>&lt;/div&gt;</pre></td>
             <td><div ng-bind="snippet"></div></td>
           </tr>
         </table>
         </div>
     </file>
     <file name="protractor.js" type="protractor">
       it('should sanitize the html snippet by default', function() {
         expect(element(by.css('#bind-html-with-sanitize div')).getAttribute('innerHTML')).
           toBe('<p>an html\n<em>click here</em>\nsnippet</p>');
       });
  
       it('should inline raw snippet if bound to a trusted value', function() {
         expect(element(by.css('#bind-html-with-trust div')).getAttribute('innerHTML')).
           toBe("<p style=\"color:blue\">an html\n" +
                "<em onmouseover=\"this.textContent='PWN3D!'\">click here</em>\n" +
                "snippet</p>");
       });
  
       it('should escape snippet without any filter', function() {
         expect(element(by.css('#bind-default div')).getAttribute('innerHTML')).
           toBe("&lt;p style=\"color:blue\"&gt;an html\n" +
                "&lt;em onmouseover=\"this.textContent='PWN3D!'\"&gt;click here&lt;/em&gt;\n" +
                "snippet&lt;/p&gt;");
       });
  
       it('should update', function() {
         element(by.model('snippet')).clear();
         element(by.model('snippet')).sendKeys('new <b onclick="alert(1)">text</b>');
         expect(element(by.css('#bind-html-with-sanitize div')).getAttribute('innerHTML')).
           toBe('new <b>text</b>');
         expect(element(by.css('#bind-html-with-trust div')).getAttribute('innerHTML')).toBe(
           'new <b onclick="alert(1)">text</b>');
         expect(element(by.css('#bind-default div')).getAttribute('innerHTML')).toBe(
           "new &lt;b onclick=\"alert(1)\"&gt;text&lt;/b&gt;");
       });
     </file>
     </example>
   */
  
    /**
     * @ngdoc provider
     * @name $sanitizeProvider
     * @this
     *
     * @description
     * Creates and configures {@link $sanitize} instance.
     */
    function $SanitizeProvider() {
      var svgEnabled = false;
  
      this.$get = [
        "$$sanitizeUri",
        function ($$sanitizeUri) {
          if (svgEnabled) {
            extend(validElements, svgElements);
          }
          return function (html) {
            var buf = [];
            htmlParser(
              html,
              htmlSanitizeWriter(buf, function (uri, isImage) {
                return !/^unsafe:/.test($$sanitizeUri(uri, isImage));
              })
            );
            return buf.join("");
          };
        }
      ];
  
      /**
       * @ngdoc method
       * @name $sanitizeProvider#enableSvg
       * @kind function
       *
       * @description
       * Enables a subset of svg to be supported by the sanitizer.
       *
       * <div class="alert alert-warning">
       *   <p>By enabling this setting without taking other precautions, you might expose your
       *   application to click-hijacking attacks. In these attacks, sanitized svg elements could be positioned
       *   outside of the containing element and be rendered over other elements on the page (e.g. a login
       *   link). Such behavior can then result in phishing incidents.</p>
       *
       *   <p>To protect against these, explicitly setup `overflow: hidden` css rule for all potential svg
       *   tags within the sanitized content:</p>
       *
       *   <br>
       *
       *   <pre><code>
       *   .rootOfTheIncludedContent svg {
       *     overflow: hidden !important;
       *   }
       *   </code></pre>
       * </div>
       *
       * @param {boolean=} flag Enable or disable SVG support in the sanitizer.
       * @returns {boolean|ng.$sanitizeProvider} Returns the currently configured value if called
       *    without an argument or self for chaining otherwise.
       */
      this.enableSvg = function (enableSvg) {
        if (isDefined(enableSvg)) {
          svgEnabled = enableSvg;
          return this;
        } else {
          return svgEnabled;
        }
      };
  
      //////////////////////////////////////////////////////////////////////////////////////////////////
      // Private stuff
      //////////////////////////////////////////////////////////////////////////////////////////////////
  
      bind = angular.bind;
      extend = angular.extend;
      forEach = angular.forEach;
      isDefined = angular.isDefined;
      lowercase = angular.lowercase;
      noop = angular.noop;
  
      htmlParser = htmlParserImpl;
      htmlSanitizeWriter = htmlSanitizeWriterImpl;
  
      nodeContains =
        window.Node.prototype.contains ||
        /** @this */ function (arg) {
          // eslint-disable-next-line no-bitwise
          return !!(this.compareDocumentPosition(arg) & 16);
        };
  
      // Regular Expressions for parsing tags and attributes
      var SURROGATE_PAIR_REGEXP = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g,
        // Match everything outside of normal chars and " (quote character)
        NON_ALPHANUMERIC_REGEXP = /([^#-~ |!])/g;
  
      // Good source of info about elements and attributes
      // http://dev.w3.org/html5/spec/Overview.html#semantics
      // http://simon.html5.org/html-elements
  
      // Safe Void Elements - HTML5
      // http://dev.w3.org/html5/spec/Overview.html#void-elements
      var voidElements = toMap("area,br,col,hr,img,wbr");
  
      // Elements that you can, intentionally, leave open (and which close themselves)
      // http://dev.w3.org/html5/spec/Overview.html#optional-tags
      var optionalEndTagBlockElements = toMap("colgroup,dd,dt,li,p,tbody,td,tfoot,th,thead,tr"),
        optionalEndTagInlineElements = toMap("rp,rt"),
        optionalEndTagElements = extend({}, optionalEndTagInlineElements, optionalEndTagBlockElements);
  
      // Safe Block Elements - HTML5
      var blockElements = extend(
        {},
        optionalEndTagBlockElements,
        toMap(
          "address,article," +
            "aside,blockquote,caption,center,del,dir,div,dl,figure,figcaption,footer,h1,h2,h3,h4,h5," +
            "h6,header,hgroup,hr,ins,map,menu,nav,ol,pre,section,table,ul"
        )
      );
  
      // Inline Elements - HTML5
      var inlineElements = extend(
        {},
        optionalEndTagInlineElements,
        toMap(
          "a,abbr,acronym,b," +
            "bdi,bdo,big,br,cite,code,del,dfn,em,font,i,img,ins,kbd,label,map,mark,q,ruby,rp,rt,s," +
            "samp,small,span,strike,strong,sub,sup,time,tt,u,var"
        )
      );
  
      // SVG Elements
      // https://wiki.whatwg.org/wiki/Sanitization_rules#svg_Elements
      // Note: the elements animate,animateColor,animateMotion,animateTransform,set are intentionally omitted.
      // They can potentially allow for arbitrary javascript to be executed. See #11290
      var svgElements = toMap(
        "circle,defs,desc,ellipse,font-face,font-face-name,font-face-src,g,glyph," +
          "hkern,image,linearGradient,line,marker,metadata,missing-glyph,mpath,path,polygon,polyline," +
          "radialGradient,rect,stop,svg,switch,text,title,tspan"
      );
  
      // Blocked Elements (will be stripped)
      var blockedElements = toMap("script,style");
  
      var validElements = extend({}, voidElements, blockElements, inlineElements, optionalEndTagElements);
  
      //Attributes that have href and hence need to be sanitized
      var uriAttrs = toMap("background,cite,href,longdesc,src,xlink:href");
  
      var htmlAttrs = toMap(
        "abbr,align,alt,axis,bgcolor,border,cellpadding,cellspacing,class,clear," +
          "color,cols,colspan,compact,coords,dir,face,headers,height,hreflang,hspace," +
          "ismap,lang,language,nohref,nowrap,rel,rev,rows,rowspan,rules," +
          "scope,scrolling,shape,size,span,start,summary,tabindex,target,title,type," +
          "valign,value,vspace,width"
      );
  
      // SVG attributes (without "id" and "name" attributes)
      // https://wiki.whatwg.org/wiki/Sanitization_rules#svg_Attributes
      var svgAttrs = toMap(
        "accent-height,accumulate,additive,alphabetic,arabic-form,ascent," +
          "baseProfile,bbox,begin,by,calcMode,cap-height,class,color,color-rendering,content," +
          "cx,cy,d,dx,dy,descent,display,dur,end,fill,fill-rule,font-family,font-size,font-stretch," +
          "font-style,font-variant,font-weight,from,fx,fy,g1,g2,glyph-name,gradientUnits,hanging," +
          "height,horiz-adv-x,horiz-origin-x,ideographic,k,keyPoints,keySplines,keyTimes,lang," +
          "marker-end,marker-mid,marker-start,markerHeight,markerUnits,markerWidth,mathematical," +
          "max,min,offset,opacity,orient,origin,overline-position,overline-thickness,panose-1," +
          "path,pathLength,points,preserveAspectRatio,r,refX,refY,repeatCount,repeatDur," +
          "requiredExtensions,requiredFeatures,restart,rotate,rx,ry,slope,stemh,stemv,stop-color," +
          "stop-opacity,strikethrough-position,strikethrough-thickness,stroke,stroke-dasharray," +
          "stroke-dashoffset,stroke-linecap,stroke-linejoin,stroke-miterlimit,stroke-opacity," +
          "stroke-width,systemLanguage,target,text-anchor,to,transform,type,u1,u2,underline-position," +
          "underline-thickness,unicode,unicode-range,units-per-em,values,version,viewBox,visibility," +
          "width,widths,x,x-height,x1,x2,xlink:actuate,xlink:arcrole,xlink:role,xlink:show,xlink:title," +
          "xlink:type,xml:base,xml:lang,xml:space,xmlns,xmlns:xlink,y,y1,y2,zoomAndPan",
        true
      );
  
      var validAttrs = extend({}, uriAttrs, svgAttrs, htmlAttrs);
  
      function toMap(str, lowercaseKeys) {
        var obj = {},
          items = str.split(","),
          i;
        for (i = 0; i < items.length; i++) {
          obj[lowercaseKeys ? lowercase(items[i]) : items[i]] = true;
        }
        return obj;
      }
  
      /**
       * Create an inert document that contains the dirty HTML that needs sanitizing
       * Depending upon browser support we use one of three strategies for doing this.
       * Support: Safari 10.x -> XHR strategy
       * Support: Firefox -> DomParser strategy
       */
      var getInertBodyElement /* function(html: string): HTMLBodyElement */ = (function (window, document) {
        var inertDocument;
        if (document && document.implementation) {
          inertDocument = document.implementation.createHTMLDocument("inert");
        } else {
          throw $sanitizeMinErr("noinert", "Can't create an inert html document");
        }
        var inertBodyElement = (inertDocument.documentElement || inertDocument.getDocumentElement()).querySelector(
          "body"
        );
  
        // Check for the Safari 10.1 bug - which allows JS to run inside the SVG G element
        inertBodyElement.innerHTML = '<svg><g onload="this.parentNode.remove()"></g></svg>';
        if (!inertBodyElement.querySelector("svg")) {
          return getInertBodyElement_XHR;
        } else {
          // Check for the Firefox bug - which prevents the inner img JS from being sanitized
          inertBodyElement.innerHTML = '<svg><p><style><img src="</style><img src=x onerror=alert(1)//">';
          if (inertBodyElement.querySelector("svg img")) {
            return getInertBodyElement_DOMParser;
          } else {
            return getInertBodyElement_InertDocument;
          }
        }
  
        function getInertBodyElement_XHR(html) {
          // We add this dummy element to ensure that the rest of the content is parsed as expected
          // e.g. leading whitespace is maintained and tags like `<meta>` do not get hoisted to the `<head>` tag.
          html = "<remove></remove>" + html;
          try {
            html = encodeURI(html);
          } catch (e) {
            return undefined;
          }
          var xhr = new window.XMLHttpRequest();
          xhr.responseType = "document";
          xhr.open("GET", "data:text/html;charset=utf-8," + html, false);
          xhr.send(null);
          var body = xhr.response.body;
          body.firstChild.remove();
          return body;
        }
  
        function getInertBodyElement_DOMParser(html) {
          // We add this dummy element to ensure that the rest of the content is parsed as expected
          // e.g. leading whitespace is maintained and tags like `<meta>` do not get hoisted to the `<head>` tag.
          html = "<remove></remove>" + html;
          try {
            var body = new window.DOMParser().parseFromString(html, "text/html").body;
            body.firstChild.remove();
            return body;
          } catch (e) {
            return undefined;
          }
        }
  
        function getInertBodyElement_InertDocument(html) {
          inertBodyElement.innerHTML = html;
  
          // Support: IE 9-11 only
          // strip custom-namespaced attributes on IE<=11
          if (document.documentMode) {
            stripCustomNsAttrs(inertBodyElement);
          }
  
          return inertBodyElement;
        }
      })(window, window.document);
  
      /**
       * @example
       * htmlParser(htmlString, {
       *     start: function(tag, attrs) {},
       *     end: function(tag) {},
       *     chars: function(text) {},
       *     comment: function(text) {}
       * });
       *
       * @param {string} html string
       * @param {object} handler
       */
      function htmlParserImpl(html, handler) {
        if (html === null || html === undefined) {
          html = "";
        } else if (typeof html !== "string") {
          html = "" + html;
        }
  
        var inertBodyElement = getInertBodyElement(html);
        if (!inertBodyElement) return "";
  
        //mXSS protection
        var mXSSAttempts = 5;
        do {
          if (mXSSAttempts === 0) {
            throw $sanitizeMinErr("uinput", "Failed to sanitize html because the input is unstable");
          }
          mXSSAttempts--;
  
          // trigger mXSS if it is going to happen by reading and writing the innerHTML
          html = inertBodyElement.innerHTML;
          inertBodyElement = getInertBodyElement(html);
        } while (html !== inertBodyElement.innerHTML);
  
        var node = inertBodyElement.firstChild;
        while (node) {
          switch (node.nodeType) {
            case 1: // ELEMENT_NODE
              handler.start(node.nodeName.toLowerCase(), attrToMap(node.attributes));
              break;
            case 3: // TEXT NODE
              handler.chars(node.textContent);
              break;
          }
  
          var nextNode;
          if (!(nextNode = node.firstChild)) {
            if (node.nodeType === 1) {
              handler.end(node.nodeName.toLowerCase());
            }
            nextNode = getNonDescendant("nextSibling", node);
            if (!nextNode) {
              while (nextNode == null) {
                node = getNonDescendant("parentNode", node);
                if (node === inertBodyElement) break;
                nextNode = getNonDescendant("nextSibling", node);
                if (node.nodeType === 1) {
                  handler.end(node.nodeName.toLowerCase());
                }
              }
            }
          }
          node = nextNode;
        }
  
        while ((node = inertBodyElement.firstChild)) {
          inertBodyElement.removeChild(node);
        }
      }
  
      function attrToMap(attrs) {
        var map = {};
        for (var i = 0, ii = attrs.length; i < ii; i++) {
          var attr = attrs[i];
          map[attr.name] = attr.value;
        }
        return map;
      }
  
      /**
       * Escapes all potentially dangerous characters, so that the
       * resulting string can be safely inserted into attribute or
       * element text.
       * @param value
       * @returns {string} escaped text
       */
      function encodeEntities(value) {
        return value
          .replace(/&/g, "&amp;")
          .replace(SURROGATE_PAIR_REGEXP, function (value) {
            var hi = value.charCodeAt(0);
            var low = value.charCodeAt(1);
            return "&#" + ((hi - 0xd800) * 0x400 + (low - 0xdc00) + 0x10000) + ";";
          })
          .replace(NON_ALPHANUMERIC_REGEXP, function (value) {
            return "&#" + value.charCodeAt(0) + ";";
          })
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      }
  
      /**
       * create an HTML/XML writer which writes to buffer
       * @param {Array} buf use buf.join('') to get out sanitized html string
       * @returns {object} in the form of {
       *     start: function(tag, attrs) {},
       *     end: function(tag) {},
       *     chars: function(text) {},
       *     comment: function(text) {}
       * }
       */
      function htmlSanitizeWriterImpl(buf, uriValidator) {
        var ignoreCurrentElement = false;
        var out = bind(buf, buf.push);
        return {
          start: function (tag, attrs) {
            tag = lowercase(tag);
            if (!ignoreCurrentElement && blockedElements[tag]) {
              ignoreCurrentElement = tag;
            }
            if (!ignoreCurrentElement && validElements[tag] === true) {
              out("<");
              out(tag);
              forEach(attrs, function (value, key) {
                var lkey = lowercase(key);
                var isImage = (tag === "img" && lkey === "src") || lkey === "background";
                if (validAttrs[lkey] === true && (uriAttrs[lkey] !== true || uriValidator(value, isImage))) {
                  out(" ");
                  out(key);
                  out('="');
                  out(encodeEntities(value));
                  out('"');
                }
              });
              out(">");
            }
          },
          end: function (tag) {
            tag = lowercase(tag);
            if (!ignoreCurrentElement && validElements[tag] === true && voidElements[tag] !== true) {
              out("</");
              out(tag);
              out(">");
            }
            // eslint-disable-next-line eqeqeq
            if (tag == ignoreCurrentElement) {
              ignoreCurrentElement = false;
            }
          },
          chars: function (chars) {
            if (!ignoreCurrentElement) {
              out(encodeEntities(chars));
            }
          }
        };
      }
  
      /**
       * When IE9-11 comes across an unknown namespaced attribute e.g. 'xlink:foo' it adds 'xmlns:ns1' attribute to declare
       * ns1 namespace and prefixes the attribute with 'ns1' (e.g. 'ns1:xlink:foo'). This is undesirable since we don't want
       * to allow any of these custom attributes. This method strips them all.
       *
       * @param node Root element to process
       */
      function stripCustomNsAttrs(node) {
        while (node) {
          if (node.nodeType === window.Node.ELEMENT_NODE) {
            var attrs = node.attributes;
            for (var i = 0, l = attrs.length; i < l; i++) {
              var attrNode = attrs[i];
              var attrName = attrNode.name.toLowerCase();
              if (attrName === "xmlns:ns1" || attrName.lastIndexOf("ns1:", 0) === 0) {
                node.removeAttributeNode(attrNode);
                i--;
                l--;
              }
            }
          }
  
          var nextNode = node.firstChild;
          if (nextNode) {
            stripCustomNsAttrs(nextNode);
          }
  
          node = getNonDescendant("nextSibling", node);
        }
      }
  
      function getNonDescendant(propName, node) {
        // An element is clobbered if its `propName` property points to one of its descendants
        var nextNode = node[propName];
        if (nextNode && nodeContains.call(node, nextNode)) {
          throw $sanitizeMinErr(
            "elclob",
            "Failed to sanitize html because the element is clobbered: {0}",
            node.outerHTML || node.outerText
          );
        }
        return nextNode;
      }
    }
  
    function sanitizeText(chars) {
      var buf = [];
      var writer = htmlSanitizeWriter(buf, noop);
      writer.chars(chars);
      return buf.join("");
    }
  
    // define ngSanitize module and register $sanitize service
    angular.module("ngSanitize", []).provider("$sanitize", $SanitizeProvider).info({ angularVersion: "1.6.8" });
  
    /**
   * @ngdoc filter
   * @name linky
   * @kind function
   *
   * @description
   * Finds links in text input and turns them into html links. Supports `http/https/ftp/sftp/mailto` and
   * plain email address links.
   *
   * Requires the {@link ngSanitize `ngSanitize`} module to be installed.
   *
   * @param {string} text Input text.
   * @param {string} [target] Window (`_blank|_self|_parent|_top`) or named frame to open links in.
   * @param {object|function(url)} [attributes] Add custom attributes to the link element.
   *
   *    Can be one of:
   *
   *    - `object`: A map of attributes
   *    - `function`: Takes the url as a parameter and returns a map of attributes
   *
   *    If the map of attributes contains a value for `target`, it overrides the value of
   *    the target parameter.
   *
   *
   * @returns {string} Html-linkified and {@link $sanitize sanitized} text.
   *
   * @usage
     <span ng-bind-html="linky_expression | linky"></span>
   *
   * @example
     <example module="linkyExample" deps="angular-sanitize.js" name="linky-filter">
       <file name="index.html">
         <div ng-controller="ExampleController">
         Snippet: <textarea ng-model="snippet" cols="60" rows="3"></textarea>
         <table>
           <tr>
             <th>Filter</th>
             <th>Source</th>
             <th>Rendered</th>
           </tr>
           <tr id="linky-filter">
             <td>linky filter</td>
             <td>
               <pre>&lt;div ng-bind-html="snippet | linky"&gt;<br>&lt;/div&gt;</pre>
             </td>
             <td>
               <div ng-bind-html="snippet | linky"></div>
             </td>
           </tr>
           <tr id="linky-target">
            <td>linky target</td>
            <td>
              <pre>&lt;div ng-bind-html="snippetWithSingleURL | linky:'_blank'"&gt;<br>&lt;/div&gt;</pre>
            </td>
            <td>
              <div ng-bind-html="snippetWithSingleURL | linky:'_blank'"></div>
            </td>
           </tr>
           <tr id="linky-custom-attributes">
            <td>linky custom attributes</td>
            <td>
              <pre>&lt;div ng-bind-html="snippetWithSingleURL | linky:'_self':{rel: 'nofollow'}"&gt;<br>&lt;/div&gt;</pre>
            </td>
            <td>
              <div ng-bind-html="snippetWithSingleURL | linky:'_self':{rel: 'nofollow'}"></div>
            </td>
           </tr>
           <tr id="escaped-html">
             <td>no filter</td>
             <td><pre>&lt;div ng-bind="snippet"&gt;<br>&lt;/div&gt;</pre></td>
             <td><div ng-bind="snippet"></div></td>
           </tr>
         </table>
       </file>
       <file name="script.js">
         angular.module('linkyExample', ['ngSanitize'])
           .controller('ExampleController', ['$scope', function($scope) {
             $scope.snippet =
               'Pretty text with some links:\n' +
               'http://angularjs.org/,\n' +
               'mailto:us@somewhere.org,\n' +
               'another@somewhere.org,\n' +
               'and one more: ftp://127.0.0.1/.';
             $scope.snippetWithSingleURL = 'http://angularjs.org/';
           }]);
       </file>
       <file name="protractor.js" type="protractor">
         it('should linkify the snippet with urls', function() {
           expect(element(by.id('linky-filter')).element(by.binding('snippet | linky')).getText()).
               toBe('Pretty text with some links: http://angularjs.org/, us@somewhere.org, ' +
                    'another@somewhere.org, and one more: ftp://127.0.0.1/.');
           expect(element.all(by.css('#linky-filter a')).count()).toEqual(4);
         });
  
         it('should not linkify snippet without the linky filter', function() {
           expect(element(by.id('escaped-html')).element(by.binding('snippet')).getText()).
               toBe('Pretty text with some links: http://angularjs.org/, mailto:us@somewhere.org, ' +
                    'another@somewhere.org, and one more: ftp://127.0.0.1/.');
           expect(element.all(by.css('#escaped-html a')).count()).toEqual(0);
         });
  
         it('should update', function() {
           element(by.model('snippet')).clear();
           element(by.model('snippet')).sendKeys('new http://link.');
           expect(element(by.id('linky-filter')).element(by.binding('snippet | linky')).getText()).
               toBe('new http://link.');
           expect(element.all(by.css('#linky-filter a')).count()).toEqual(1);
           expect(element(by.id('escaped-html')).element(by.binding('snippet')).getText())
               .toBe('new http://link.');
         });
  
         it('should work with the target property', function() {
          expect(element(by.id('linky-target')).
              element(by.binding("snippetWithSingleURL | linky:'_blank'")).getText()).
              toBe('http://angularjs.org/');
          expect(element(by.css('#linky-target a')).getAttribute('target')).toEqual('_blank');
         });
  
         it('should optionally add custom attributes', function() {
          expect(element(by.id('linky-custom-attributes')).
              element(by.binding("snippetWithSingleURL | linky:'_self':{rel: 'nofollow'}")).getText()).
              toBe('http://angularjs.org/');
          expect(element(by.css('#linky-custom-attributes a')).getAttribute('rel')).toEqual('nofollow');
         });
       </file>
     </example>
   */
    angular.module("ngSanitize").filter("linky", [
      "$sanitize",
      function ($sanitize) {
        var LINKY_URL_REGEXP = /((s?ftp|https?):\/\/|(www\.)|(mailto:)?[A-Za-z0-9._%+-]+@)\S*[^\s.;,(){}<>"\u201d\u2019]/i,
          MAILTO_REGEXP = /^mailto:/i;
  
        var linkyMinErr = angular.$$minErr("linky");
        var isDefined = angular.isDefined;
        var isFunction = angular.isFunction;
        var isObject = angular.isObject;
        var isString = angular.isString;
  
        return function (text, target, attributes) {
          if (text == null || text === "") return text;
          if (!isString(text)) throw linkyMinErr("notstring", "Expected string but received: {0}", text);
  
          var attributesFn = isFunction(attributes)
            ? attributes
            : isObject(attributes)
            ? function getAttributesObject() {
                return attributes;
              }
            : function getEmptyAttributesObject() {
                return {};
              };
  
          var match;
          var raw = text;
          var html = [];
          var url;
          var i;
          while ((match = raw.match(LINKY_URL_REGEXP))) {
            // We can not end in these as they are sometimes found at the end of the sentence
            url = match[0];
            // if we did not match ftp/http/www/mailto then assume mailto
            if (!match[2] && !match[4]) {
              url = (match[3] ? "http://" : "mailto:") + url;
            }
            i = match.index;
            addText(raw.substr(0, i));
            addLink(url, match[0].replace(MAILTO_REGEXP, ""));
            raw = raw.substring(i + match[0].length);
          }
          addText(raw);
          return $sanitize(html.join(""));
  
          function addText(text) {
            if (!text) {
              return;
            }
            html.push(sanitizeText(text));
          }
  
          function addLink(url, text) {
            var key,
              linkAttributes = attributesFn(url);
            html.push("<a ");
  
            for (key in linkAttributes) {
              html.push(key + '="' + linkAttributes[key] + '" ');
            }
  
            if (isDefined(target) && !("target" in linkAttributes)) {
              html.push('target="', target, '" ');
            }
            html.push('href="', url.replace(/"/g, "&quot;"), '">');
            addText(text);
            html.push("</a>");
          }
        };
      }
    ]);
  })(window, window.angular);
  /**!
   * Sortable
   * @author	RubaXa   <trash@rubaxa.org>
   * @license MIT
   */
  
  (function sortableModule(factory) {
    "use strict";
  
    if (typeof define === "function" && define.amd) {
      define(factory);
    } else if (typeof module != "undefined" && typeof module.exports != "undefined") {
      module.exports = factory();
    } else {
      /* jshint sub:true */
      window["Sortable"] = factory();
    }
  })(function sortableFactory() {
    "use strict";
  
    if (typeof window == "undefined" || !window.document) {
      return function sortableError() {
        throw new Error("Sortable.js requires a window with a document");
      };
    }
  
    var dragEl,
      parentEl,
      ghostEl,
      cloneEl,
      rootEl,
      nextEl,
      lastDownEl,
      scrollEl,
      scrollParentEl,
      scrollCustomFn,
      lastEl,
      lastCSS,
      lastParentCSS,
      oldIndex,
      newIndex,
      activeGroup,
      putSortable,
      autoScroll = {},
      tapEvt,
      touchEvt,
      moved,
      /** @const */
      R_SPACE = /\s+/g,
      R_FLOAT = /left|right|inline/,
      expando = "Sortable" + new Date().getTime(),
      win = window,
      document = win.document,
      parseInt = win.parseInt,
      $ = win.jQuery || win.Zepto,
      Polymer = win.Polymer,
      captureMode = false,
      supportDraggable = !!("draggable" in document.createElement("div")),
      supportCssPointerEvents = (function (el) {
        // false when IE11
        if (!!navigator.userAgent.match(/Trident.*rv[ :]?11\./)) {
          return false;
        }
        el = document.createElement("x");
        el.style.cssText = "pointer-events:auto";
        return el.style.pointerEvents === "auto";
      })(),
      _silent = false,
      abs = Math.abs,
      min = Math.min,
      savedInputChecked = [],
      touchDragOverListeners = [],
      _autoScroll = _throttle(function (/**Event*/ evt, /**Object*/ options, /**HTMLElement*/ rootEl) {
        // Bug: https://bugzilla.mozilla.org/show_bug.cgi?id=505521
        if (rootEl && options.scroll) {
          var _this = rootEl[expando],
            el,
            rect,
            sens = options.scrollSensitivity,
            speed = options.scrollSpeed,
            x = evt.clientX,
            y = evt.clientY,
            winWidth = window.innerWidth,
            winHeight = window.innerHeight,
            vx,
            vy,
            scrollOffsetX,
            scrollOffsetY;
  
          // Delect scrollEl
          if (scrollParentEl !== rootEl) {
            scrollEl = options.scroll;
            scrollParentEl = rootEl;
            scrollCustomFn = options.scrollFn;
  
            if (scrollEl === true) {
              scrollEl = rootEl;
  
              do {
                if (scrollEl.offsetWidth < scrollEl.scrollWidth || scrollEl.offsetHeight < scrollEl.scrollHeight) {
                  break;
                }
                /* jshint boss:true */
              } while ((scrollEl = scrollEl.parentNode));
            }
          }
  
          if (scrollEl) {
            el = scrollEl;
            rect = scrollEl.getBoundingClientRect();
            vx = (abs(rect.right - x) <= sens) - (abs(rect.left - x) <= sens);
            vy = (abs(rect.bottom - y) <= sens) - (abs(rect.top - y) <= sens);
          }
  
          if (!(vx || vy)) {
            vx = (winWidth - x <= sens) - (x <= sens);
            vy = (winHeight - y <= sens) - (y <= sens);
  
            /* jshint expr:true */
            (vx || vy) && (el = win);
          }
  
          if (autoScroll.vx !== vx || autoScroll.vy !== vy || autoScroll.el !== el) {
            autoScroll.el = el;
            autoScroll.vx = vx;
            autoScroll.vy = vy;
  
            clearInterval(autoScroll.pid);
  
            if (el) {
              autoScroll.pid = setInterval(function () {
                scrollOffsetY = vy ? vy * speed : 0;
                scrollOffsetX = vx ? vx * speed : 0;
  
                if ("function" === typeof scrollCustomFn) {
                  return scrollCustomFn.call(_this, scrollOffsetX, scrollOffsetY, evt);
                }
  
                if (el === win) {
                  win.scrollTo(win.pageXOffset + scrollOffsetX, win.pageYOffset + scrollOffsetY);
                } else {
                  el.scrollTop += scrollOffsetY;
                  el.scrollLeft += scrollOffsetX;
                }
              }, 24);
            }
          }
        }
      }, 30),
      _prepareGroup = function (options) {
        function toFn(value, pull) {
          if (value === void 0 || value === true) {
            value = group.name;
          }
  
          if (typeof value === "function") {
            return value;
          } else {
            return function (to, from) {
              var fromGroup = from.options.group.name;
  
              return pull ? value : value && (value.join ? value.indexOf(fromGroup) > -1 : fromGroup == value);
            };
          }
        }
  
        var group = {};
        var originalGroup = options.group;
  
        if (!originalGroup || typeof originalGroup != "object") {
          originalGroup = { name: originalGroup };
        }
  
        group.name = originalGroup.name;
        group.checkPull = toFn(originalGroup.pull, true);
        group.checkPut = toFn(originalGroup.put);
        group.revertClone = originalGroup.revertClone;
  
        options.group = group;
      };
    /**
     * @class  Sortable
     * @param  {HTMLElement}  el
     * @param  {Object}       [options]
     */
    function Sortable(el, options) {
      if (!(el && el.nodeType && el.nodeType === 1)) {
        throw "Sortable: `el` must be HTMLElement, and not " + {}.toString.call(el);
      }
  
      this.el = el; // root element
      this.options = options = _extend({}, options);
  
      // Export instance
      el[expando] = this;
  
      // Default options
      var defaults = {
        group: Math.random(),
        sort: true,
        disabled: false,
        store: null,
        handle: null,
        scroll: true,
        scrollSensitivity: 30,
        scrollSpeed: 10,
        draggable: /[uo]l/i.test(el.nodeName) ? "li" : ">*",
        ghostClass: "sortable-ghost",
        chosenClass: "sortable-chosen",
        dragClass: "sortable-drag",
        ignore: "a, img",
        filter: null,
        preventOnFilter: true,
        animation: 0,
        setData: function (dataTransfer, dragEl) {
          dataTransfer.setData("Text", dragEl.textContent);
        },
        dropBubble: false,
        dragoverBubble: false,
        dataIdAttr: "data-id",
        delay: 0,
        forceFallback: false,
        fallbackClass: "sortable-fallback",
        fallbackOnBody: false,
        fallbackTolerance: 0,
        fallbackOffset: { x: 0, y: 0 }
      };
  
      // Set default options
      for (var name in defaults) {
        !(name in options) && (options[name] = defaults[name]);
      }
  
      _prepareGroup(options);
  
      // Bind all private methods
      for (var fn in this) {
        if (fn.charAt(0) === "_" && typeof this[fn] === "function") {
          this[fn] = this[fn].bind(this);
        }
      }
  
      // Setup drag mode
      this.nativeDraggable = options.forceFallback ? false : supportDraggable;
  
      // Bind events
      _on(el, "mousedown", this._onTapStart);
      _on(el, "touchstart", this._onTapStart);
      _on(el, "pointerdown", this._onTapStart);
  
      if (this.nativeDraggable) {
        _on(el, "dragover", this);
        _on(el, "dragenter", this);
      }
  
      touchDragOverListeners.push(this._onDragOver);
  
      // Restore sorting
      options.store && this.sort(options.store.get(this));
    }
  
    Sortable.prototype = /** @lends Sortable.prototype */ {
      constructor: Sortable,
  
      _onTapStart: function (/** Event|TouchEvent */ evt) {
        var _this = this,
          el = this.el,
          options = this.options,
          preventOnFilter = options.preventOnFilter,
          type = evt.type,
          touch = evt.touches && evt.touches[0],
          target = (touch || evt).target,
          originalTarget = (evt.target.shadowRoot && evt.path && evt.path[0]) || target,
          filter = options.filter,
          startIndex;
  
        _saveInputCheckedState(el);
  
        // Don't trigger start event when an element is been dragged, otherwise the evt.oldindex always wrong when set option.group.
        if (dragEl) {
          return;
        }
  
        if ((/mousedown|pointerdown/.test(type) && evt.button !== 0) || options.disabled) {
          return; // only left button or enabled
        }
  
        target = _closest(target, options.draggable, el);
  
        if (!target) {
          return;
        }
  
        if (lastDownEl === target) {
          // Ignoring duplicate `down`
          return;
        }
  
        // Get the index of the dragged element within its parent
        startIndex = _index(target, options.draggable);
  
        // Check filter
        if (typeof filter === "function") {
          if (filter.call(this, evt, target, this)) {
            _dispatchEvent(_this, originalTarget, "filter", target, el, startIndex);
            preventOnFilter && evt.preventDefault();
            return; // cancel dnd
          }
        } else if (filter) {
          filter = filter.split(",").some(function (criteria) {
            criteria = _closest(originalTarget, criteria.trim(), el);
  
            if (criteria) {
              _dispatchEvent(_this, criteria, "filter", target, el, startIndex);
              return true;
            }
          });
  
          if (filter) {
            preventOnFilter && evt.preventDefault();
            return; // cancel dnd
          }
        }
  
        if (options.handle && !_closest(originalTarget, options.handle, el)) {
          return;
        }
  
        // Prepare `dragstart`
        this._prepareDragStart(evt, touch, target, startIndex);
      },
  
      _prepareDragStart: function (
        /** Event */ evt,
        /** Touch */ touch,
        /** HTMLElement */ target,
        /** Number */ startIndex
      ) {
        var _this = this,
          el = _this.el,
          options = _this.options,
          ownerDocument = el.ownerDocument,
          dragStartFn;
  
        if (target && !dragEl && target.parentNode === el) {
          tapEvt = evt;
  
          rootEl = el;
          dragEl = target;
          parentEl = dragEl.parentNode;
          nextEl = dragEl.nextSibling;
          lastDownEl = target;
          activeGroup = options.group;
          oldIndex = startIndex;
  
          this._lastX = (touch || evt).clientX;
          this._lastY = (touch || evt).clientY;
  
          dragEl.style["will-change"] = "transform";
  
          dragStartFn = function () {
            // Delayed drag has been triggered
            // we can re-enable the events: touchmove/mousemove
            _this._disableDelayedDrag();
  
            // Make the element draggable
            dragEl.draggable = _this.nativeDraggable;
  
            // Chosen item
            _toggleClass(dragEl, options.chosenClass, true);
  
            // Bind the events: dragstart/dragend
            _this._triggerDragStart(evt, touch);
  
            // Drag start event
            _dispatchEvent(_this, rootEl, "choose", dragEl, rootEl, oldIndex);
          };
  
          // Disable "draggable"
          options.ignore.split(",").forEach(function (criteria) {
            _find(dragEl, criteria.trim(), _disableDraggable);
          });
  
          _on(ownerDocument, "mouseup", _this._onDrop);
          _on(ownerDocument, "touchend", _this._onDrop);
          _on(ownerDocument, "touchcancel", _this._onDrop);
          _on(ownerDocument, "pointercancel", _this._onDrop);
          _on(ownerDocument, "selectstart", _this);
  
          if (options.delay) {
            // If the user moves the pointer or let go the click or touch
            // before the delay has been reached:
            // disable the delayed drag
            _on(ownerDocument, "mouseup", _this._disableDelayedDrag);
            _on(ownerDocument, "touchend", _this._disableDelayedDrag);
            _on(ownerDocument, "touchcancel", _this._disableDelayedDrag);
            _on(ownerDocument, "mousemove", _this._disableDelayedDrag);
            _on(ownerDocument, "touchmove", _this._disableDelayedDrag);
            _on(ownerDocument, "pointermove", _this._disableDelayedDrag);
  
            _this._dragStartTimer = setTimeout(dragStartFn, options.delay);
          } else {
            dragStartFn();
          }
        }
      },
  
      _disableDelayedDrag: function () {
        var ownerDocument = this.el.ownerDocument;
  
        clearTimeout(this._dragStartTimer);
        _off(ownerDocument, "mouseup", this._disableDelayedDrag);
        _off(ownerDocument, "touchend", this._disableDelayedDrag);
        _off(ownerDocument, "touchcancel", this._disableDelayedDrag);
        _off(ownerDocument, "mousemove", this._disableDelayedDrag);
        _off(ownerDocument, "touchmove", this._disableDelayedDrag);
        _off(ownerDocument, "pointermove", this._disableDelayedDrag);
      },
  
      _triggerDragStart: function (/** Event */ evt, /** Touch */ touch) {
        touch = touch || (evt.pointerType == "touch" ? evt : null);
  
        if (touch) {
          // Touch device support
          tapEvt = {
            target: dragEl,
            clientX: touch.clientX,
            clientY: touch.clientY
          };
  
          this._onDragStart(tapEvt, "touch");
        } else if (!this.nativeDraggable) {
          this._onDragStart(tapEvt, true);
        } else {
          _on(dragEl, "dragend", this);
          _on(rootEl, "dragstart", this._onDragStart);
        }
  
        try {
          if (document.selection) {
            // Timeout neccessary for IE9
            setTimeout(function () {
              document.selection.empty();
            });
          } else {
            window.getSelection().removeAllRanges();
          }
        } catch (err) {}
      },
  
      _dragStarted: function () {
        if (rootEl && dragEl) {
          var options = this.options;
  
          // Apply effect
          _toggleClass(dragEl, options.ghostClass, true);
          _toggleClass(dragEl, options.dragClass, false);
  
          Sortable.active = this;
  
          // Drag start event
          _dispatchEvent(this, rootEl, "start", dragEl, rootEl, oldIndex);
        } else {
          this._nulling();
        }
      },
  
      _emulateDragOver: function () {
        if (touchEvt) {
          if (this._lastX === touchEvt.clientX && this._lastY === touchEvt.clientY) {
            return;
          }
  
          this._lastX = touchEvt.clientX;
          this._lastY = touchEvt.clientY;
  
          if (!supportCssPointerEvents) {
            _css(ghostEl, "display", "none");
          }
  
          var target = document.elementFromPoint(touchEvt.clientX, touchEvt.clientY),
            parent = target,
            i = touchDragOverListeners.length;
  
          if (parent) {
            do {
              if (parent[expando]) {
                while (i--) {
                  touchDragOverListeners[i]({
                    clientX: touchEvt.clientX,
                    clientY: touchEvt.clientY,
                    target: target,
                    rootEl: parent
                  });
                }
  
                break;
              }
  
              target = parent; // store last element
            } while (
              /* jshint boss:true */
              (parent = parent.parentNode)
            );
          }
  
          if (!supportCssPointerEvents) {
            _css(ghostEl, "display", "");
          }
        }
      },
  
      _onTouchMove: function (/**TouchEvent*/ evt) {
        if (tapEvt) {
          var options = this.options,
            fallbackTolerance = options.fallbackTolerance,
            fallbackOffset = options.fallbackOffset,
            touch = evt.touches ? evt.touches[0] : evt,
            dx = touch.clientX - tapEvt.clientX + fallbackOffset.x,
            dy = touch.clientY - tapEvt.clientY + fallbackOffset.y,
            translate3d = evt.touches
              ? "translate3d(" + dx + "px," + dy + "px,0)"
              : "translate(" + dx + "px," + dy + "px)";
  
          // only set the status to dragging, when we are actually dragging
          if (!Sortable.active) {
            if (
              fallbackTolerance &&
              min(abs(touch.clientX - this._lastX), abs(touch.clientY - this._lastY)) < fallbackTolerance
            ) {
              return;
            }
  
            this._dragStarted();
          }
  
          // as well as creating the ghost element on the document body
          this._appendGhost();
  
          moved = true;
          touchEvt = touch;
  
          _css(ghostEl, "webkitTransform", translate3d);
          _css(ghostEl, "mozTransform", translate3d);
          _css(ghostEl, "msTransform", translate3d);
          _css(ghostEl, "transform", translate3d);
  
          evt.preventDefault();
        }
      },
  
      _appendGhost: function () {
        if (!ghostEl) {
          var rect = dragEl.getBoundingClientRect(),
            css = _css(dragEl),
            options = this.options,
            ghostRect;
  
          ghostEl = dragEl.cloneNode(true);
  
          _toggleClass(ghostEl, options.ghostClass, false);
          _toggleClass(ghostEl, options.fallbackClass, true);
          _toggleClass(ghostEl, options.dragClass, true);
  
          _css(ghostEl, "top", rect.top - parseInt(css.marginTop, 10));
          _css(ghostEl, "left", rect.left - parseInt(css.marginLeft, 10));
          _css(ghostEl, "width", rect.width);
          _css(ghostEl, "height", rect.height);
          _css(ghostEl, "opacity", "0.8");
          _css(ghostEl, "position", "fixed");
          _css(ghostEl, "zIndex", "100000");
          _css(ghostEl, "pointerEvents", "none");
  
          (options.fallbackOnBody && document.body.appendChild(ghostEl)) || rootEl.appendChild(ghostEl);
  
          // Fixing dimensions.
          ghostRect = ghostEl.getBoundingClientRect();
          _css(ghostEl, "width", rect.width * 2 - ghostRect.width);
          _css(ghostEl, "height", rect.height * 2 - ghostRect.height);
        }
      },
  
      _onDragStart: function (/**Event*/ evt, /**boolean*/ useFallback) {
        var dataTransfer = evt.dataTransfer,
          options = this.options;
  
        this._offUpEvents();
  
        if (activeGroup.checkPull(this, this, dragEl, evt)) {
          cloneEl = _clone(dragEl);
  
          cloneEl.draggable = false;
          cloneEl.style["will-change"] = "";
  
          _css(cloneEl, "display", "none");
          _toggleClass(cloneEl, this.options.chosenClass, false);
  
          rootEl.insertBefore(cloneEl, dragEl);
          _dispatchEvent(this, rootEl, "clone", dragEl);
        }
  
        _toggleClass(dragEl, options.dragClass, true);
  
        if (useFallback) {
          if (useFallback === "touch") {
            // Bind touch events
            _on(document, "touchmove", this._onTouchMove);
            _on(document, "touchend", this._onDrop);
            _on(document, "touchcancel", this._onDrop);
            _on(document, "pointermove", this._onTouchMove);
            _on(document, "pointerup", this._onDrop);
          } else {
            // Old brwoser
            _on(document, "mousemove", this._onTouchMove);
            _on(document, "mouseup", this._onDrop);
          }
  
          this._loopId = setInterval(this._emulateDragOver, 50);
        } else {
          if (dataTransfer) {
            dataTransfer.effectAllowed = "move";
            options.setData && options.setData.call(this, dataTransfer, dragEl);
          }
  
          _on(document, "drop", this);
          setTimeout(this._dragStarted, 0);
        }
      },
  
      _onDragOver: function (/**Event*/ evt) {
        var el = this.el,
          target,
          dragRect,
          targetRect,
          revert,
          options = this.options,
          group = options.group,
          activeSortable = Sortable.active,
          isOwner = activeGroup === group,
          isMovingBetweenSortable = false,
          canSort = options.sort;
  
        if (evt.preventDefault !== void 0) {
          evt.preventDefault();
          !options.dragoverBubble && evt.stopPropagation();
        }
  
        if (dragEl.animated) {
          return;
        }
  
        moved = true;
  
        if (
          activeSortable &&
          !options.disabled &&
          (isOwner
            ? canSort || (revert = !rootEl.contains(dragEl)) // Reverting item into the original list
            : putSortable === this ||
              ((activeSortable.lastPullMode = activeGroup.checkPull(this, activeSortable, dragEl, evt)) &&
                group.checkPut(this, activeSortable, dragEl, evt))) &&
          (evt.rootEl === void 0 || evt.rootEl === this.el) // touch fallback
        ) {
          // Smart auto-scrolling
          _autoScroll(evt, options, this.el);
  
          if (_silent) {
            return;
          }
  
          target = _closest(evt.target, options.draggable, el);
          dragRect = dragEl.getBoundingClientRect();
  
          if (putSortable !== this) {
            putSortable = this;
            isMovingBetweenSortable = true;
          }
  
          if (revert) {
            _cloneHide(activeSortable, true);
            parentEl = rootEl; // actualization
  
            if (cloneEl || nextEl) {
              rootEl.insertBefore(dragEl, cloneEl || nextEl);
            } else if (!canSort) {
              rootEl.appendChild(dragEl);
            }
  
            return;
          }
  
          if (el.children.length === 0 || el.children[0] === ghostEl || (el === evt.target && _ghostIsLast(el, evt))) {
            //assign target only if condition is true
            if (el.children.length !== 0 && el.children[0] !== ghostEl && el === evt.target) {
              target = el.lastElementChild;
            }
  
            if (target) {
              if (target.animated) {
                return;
              }
  
              targetRect = target.getBoundingClientRect();
            }
  
            _cloneHide(activeSortable, isOwner);
  
            if (_onMove(rootEl, el, dragEl, dragRect, target, targetRect, evt) !== false) {
              if (!dragEl.contains(el)) {
                el.appendChild(dragEl);
                parentEl = el; // actualization
              }
  
              this._animate(dragRect, dragEl);
              target && this._animate(targetRect, target);
            }
          } else if (target && !target.animated && target !== dragEl && target.parentNode[expando] !== void 0) {
            if (lastEl !== target) {
              lastEl = target;
              lastCSS = _css(target);
              lastParentCSS = _css(target.parentNode);
            }
  
            targetRect = target.getBoundingClientRect();
  
            var width = targetRect.right - targetRect.left,
              height = targetRect.bottom - targetRect.top,
              floating =
                R_FLOAT.test(lastCSS.cssFloat + lastCSS.display) ||
                (lastParentCSS.display == "flex" && lastParentCSS["flex-direction"].indexOf("row") === 0),
              isWide = target.offsetWidth > dragEl.offsetWidth,
              isLong = target.offsetHeight > dragEl.offsetHeight,
              halfway =
                (floating ? (evt.clientX - targetRect.left) / width : (evt.clientY - targetRect.top) / height) > 0.5,
              nextSibling = target.nextElementSibling,
              after = false;
            if (floating) {
              var elTop = dragEl.offsetTop,
                tgTop = target.offsetTop;
  
              if (elTop === tgTop) {
                after = (target.previousElementSibling === dragEl && !isWide) || (halfway && isWide);
              } else if (target.previousElementSibling === dragEl || dragEl.previousElementSibling === target) {
                after = (evt.clientY - targetRect.top) / height > 0.5;
              } else {
                after = tgTop > elTop;
              }
            } else if (!isMovingBetweenSortable) {
              after = (nextSibling !== dragEl && !isLong) || (halfway && isLong);
            }
  
            var moveVector = _onMove(rootEl, el, dragEl, dragRect, target, targetRect, evt, after);
  
            if (moveVector !== false) {
              if (moveVector === 1 || moveVector === -1) {
                after = moveVector === 1;
              }
  
              _silent = true;
              setTimeout(_unsilent, 30);
  
              _cloneHide(activeSortable, isOwner);
  
              if (!dragEl.contains(el)) {
                if (after && !nextSibling) {
                  el.appendChild(dragEl);
                } else {
                  target.parentNode.insertBefore(dragEl, after ? nextSibling : target);
                }
              }
  
              parentEl = dragEl.parentNode; // actualization
  
              this._animate(dragRect, dragEl);
              this._animate(targetRect, target);
            }
          }
        }
      },
  
      _animate: function (prevRect, target) {
        var ms = this.options.animation;
  
        if (ms) {
          var currentRect = target.getBoundingClientRect();
  
          if (prevRect.nodeType === 1) {
            prevRect = prevRect.getBoundingClientRect();
          }
  
          _css(target, "transition", "none");
          _css(
            target,
            "transform",
            "translate3d(" + (prevRect.left - currentRect.left) + "px," + (prevRect.top - currentRect.top) + "px,0)"
          );
  
          target.offsetWidth; // repaint
  
          _css(target, "transition", "all " + ms + "ms");
          _css(target, "transform", "translate3d(0,0,0)");
  
          clearTimeout(target.animated);
          target.animated = setTimeout(function () {
            _css(target, "transition", "");
            _css(target, "transform", "");
            target.animated = false;
          }, ms);
        }
      },
  
      _offUpEvents: function () {
        var ownerDocument = this.el.ownerDocument;
  
        _off(document, "touchmove", this._onTouchMove);
        _off(document, "pointermove", this._onTouchMove);
        _off(ownerDocument, "mouseup", this._onDrop);
        _off(ownerDocument, "touchend", this._onDrop);
        _off(ownerDocument, "pointerup", this._onDrop);
        _off(ownerDocument, "touchcancel", this._onDrop);
        _off(ownerDocument, "pointercancel", this._onDrop);
        _off(ownerDocument, "selectstart", this);
      },
  
      _onDrop: function (/**Event*/ evt) {
        var el = this.el,
          options = this.options;
  
        clearInterval(this._loopId);
        clearInterval(autoScroll.pid);
        clearTimeout(this._dragStartTimer);
  
        // Unbind events
        _off(document, "mousemove", this._onTouchMove);
  
        if (this.nativeDraggable) {
          _off(document, "drop", this);
          _off(el, "dragstart", this._onDragStart);
        }
  
        this._offUpEvents();
  
        if (evt) {
          if (moved) {
            evt.preventDefault();
            !options.dropBubble && evt.stopPropagation();
          }
  
          ghostEl && ghostEl.parentNode && ghostEl.parentNode.removeChild(ghostEl);
  
          if (rootEl === parentEl || Sortable.active.lastPullMode !== "clone") {
            // Remove clone
            cloneEl && cloneEl.parentNode && cloneEl.parentNode.removeChild(cloneEl);
          }
  
          if (dragEl) {
            if (this.nativeDraggable) {
              _off(dragEl, "dragend", this);
            }
  
            _disableDraggable(dragEl);
            dragEl.style["will-change"] = "";
  
            // Remove class's
            _toggleClass(dragEl, this.options.ghostClass, false);
            _toggleClass(dragEl, this.options.chosenClass, false);
  
            // Drag stop event
            _dispatchEvent(this, rootEl, "unchoose", dragEl, rootEl, oldIndex);
  
            if (rootEl !== parentEl) {
              newIndex = _index(dragEl, options.draggable);
  
              if (newIndex >= 0) {
                // Add event
                _dispatchEvent(null, parentEl, "add", dragEl, rootEl, oldIndex, newIndex);
  
                // Remove event
                _dispatchEvent(this, rootEl, "remove", dragEl, rootEl, oldIndex, newIndex);
  
                // drag from one list and drop into another
                _dispatchEvent(null, parentEl, "sort", dragEl, rootEl, oldIndex, newIndex);
                _dispatchEvent(this, rootEl, "sort", dragEl, rootEl, oldIndex, newIndex);
              }
            } else {
              if (dragEl.nextSibling !== nextEl) {
                // Get the index of the dragged element within its parent
                newIndex = _index(dragEl, options.draggable);
  
                if (newIndex >= 0) {
                  // drag & drop within the same list
                  _dispatchEvent(this, rootEl, "update", dragEl, rootEl, oldIndex, newIndex);
                  _dispatchEvent(this, rootEl, "sort", dragEl, rootEl, oldIndex, newIndex);
                }
              }
            }
  
            if (Sortable.active) {
              /* jshint eqnull:true */
              if (newIndex == null || newIndex === -1) {
                newIndex = oldIndex;
              }
  
              _dispatchEvent(this, rootEl, "end", dragEl, rootEl, oldIndex, newIndex);
  
              // Save sorting
              this.save();
            }
          }
        }
  
        this._nulling();
      },
  
      _nulling: function () {
        rootEl = dragEl = parentEl = ghostEl = nextEl = cloneEl = lastDownEl = scrollEl = scrollParentEl = tapEvt = touchEvt = moved = newIndex = lastEl = lastCSS = putSortable = activeGroup = Sortable.active = null;
  
        savedInputChecked.forEach(function (el) {
          el.checked = true;
        });
        savedInputChecked.length = 0;
      },
  
      handleEvent: function (/**Event*/ evt) {
        switch (evt.type) {
          case "drop":
          case "dragend":
            this._onDrop(evt);
            break;
  
          case "dragover":
          case "dragenter":
            if (dragEl) {
              this._onDragOver(evt);
              _globalDragOver(evt);
            }
            break;
  
          case "selectstart":
            evt.preventDefault();
            break;
        }
      },
  
      /**
       * Serializes the item into an array of string.
       * @returns {String[]}
       */
      toArray: function () {
        var order = [],
          el,
          children = this.el.children,
          i = 0,
          n = children.length,
          options = this.options;
  
        for (; i < n; i++) {
          el = children[i];
          if (_closest(el, options.draggable, this.el)) {
            order.push(el.getAttribute(options.dataIdAttr) || _generateId(el));
          }
        }
  
        return order;
      },
  
      /**
       * Sorts the elements according to the array.
       * @param  {String[]}  order  order of the items
       */
      sort: function (order) {
        var items = {},
          rootEl = this.el;
  
        this.toArray().forEach(function (id, i) {
          var el = rootEl.children[i];
  
          if (_closest(el, this.options.draggable, rootEl)) {
            items[id] = el;
          }
        }, this);
  
        order.forEach(function (id) {
          if (items[id]) {
            rootEl.removeChild(items[id]);
            rootEl.appendChild(items[id]);
          }
        });
      },
  
      /**
       * Save the current sorting
       */
      save: function () {
        var store = this.options.store;
        store && store.set(this);
      },
  
      /**
       * For each element in the set, get the first element that matches the selector by testing the element itself and traversing up through its ancestors in the DOM tree.
       * @param   {HTMLElement}  el
       * @param   {String}       [selector]  default: `options.draggable`
       * @returns {HTMLElement|null}
       */
      closest: function (el, selector) {
        return _closest(el, selector || this.options.draggable, this.el);
      },
  
      /**
       * Set/get option
       * @param   {string} name
       * @param   {*}      [value]
       * @returns {*}
       */
      option: function (name, value) {
        var options = this.options;
  
        if (value === void 0) {
          return options[name];
        } else {
          options[name] = value;
  
          if (name === "group") {
            _prepareGroup(options);
          }
        }
      },
  
      /**
       * Destroy
       */
      destroy: function () {
        var el = this.el;
  
        el[expando] = null;
  
        _off(el, "mousedown", this._onTapStart);
        _off(el, "touchstart", this._onTapStart);
        _off(el, "pointerdown", this._onTapStart);
  
        if (this.nativeDraggable) {
          _off(el, "dragover", this);
          _off(el, "dragenter", this);
        }
  
        // Remove draggable attributes
        Array.prototype.forEach.call(el.querySelectorAll("[draggable]"), function (el) {
          el.removeAttribute("draggable");
        });
  
        touchDragOverListeners.splice(touchDragOverListeners.indexOf(this._onDragOver), 1);
  
        this._onDrop();
  
        this.el = el = null;
      }
    };
  
    function _cloneHide(sortable, state) {
      if (sortable.lastPullMode !== "clone") {
        state = true;
      }
  
      if (cloneEl && cloneEl.state !== state) {
        _css(cloneEl, "display", state ? "none" : "");
  
        if (!state) {
          if (cloneEl.state) {
            if (sortable.options.group.revertClone) {
              rootEl.insertBefore(cloneEl, nextEl);
              sortable._animate(dragEl, cloneEl);
            } else {
              rootEl.insertBefore(cloneEl, dragEl);
            }
          }
        }
  
        cloneEl.state = state;
      }
    }
  
    function _closest(/**HTMLElement*/ el, /**String*/ selector, /**HTMLElement*/ ctx) {
      if (el) {
        ctx = ctx || document;
  
        do {
          if ((selector === ">*" && el.parentNode === ctx) || _matches(el, selector)) {
            return el;
          }
          /* jshint boss:true */
        } while ((el = _getParentOrHost(el)));
      }
  
      return null;
    }
  
    function _getParentOrHost(el) {
      var parent = el.host;
  
      return parent && parent.nodeType ? parent : el.parentNode;
    }
  
    function _globalDragOver(/**Event*/ evt) {
      if (evt.dataTransfer) {
        evt.dataTransfer.dropEffect = "move";
      }
      evt.preventDefault();
    }
  
    function _on(el, event, fn) {
      el.addEventListener(event, fn, captureMode);
    }
  
    function _off(el, event, fn) {
      el.removeEventListener(event, fn, captureMode);
    }
  
    function _toggleClass(el, name, state) {
      if (el) {
        if (el.classList) {
          el.classList[state ? "add" : "remove"](name);
        } else {
          var className = (" " + el.className + " ").replace(R_SPACE, " ").replace(" " + name + " ", " ");
          el.className = (className + (state ? " " + name : "")).replace(R_SPACE, " ");
        }
      }
    }
  
    function _css(el, prop, val) {
      var style = el && el.style;
  
      if (style) {
        if (val === void 0) {
          if (document.defaultView && document.defaultView.getComputedStyle) {
            val = document.defaultView.getComputedStyle(el, "");
          } else if (el.currentStyle) {
            val = el.currentStyle;
          }
  
          return prop === void 0 ? val : val[prop];
        } else {
          if (!(prop in style)) {
            prop = "-webkit-" + prop;
          }
  
          style[prop] = val + (typeof val === "string" ? "" : "px");
        }
      }
    }
  
    function _find(ctx, tagName, iterator) {
      if (ctx) {
        var list = ctx.getElementsByTagName(tagName),
          i = 0,
          n = list.length;
  
        if (iterator) {
          for (; i < n; i++) {
            iterator(list[i], i);
          }
        }
  
        return list;
      }
  
      return [];
    }
  
    function _dispatchEvent(sortable, rootEl, name, targetEl, fromEl, startIndex, newIndex) {
      sortable = sortable || rootEl[expando];
  
      var evt = document.createEvent("Event"),
        options = sortable.options,
        onName = "on" + name.charAt(0).toUpperCase() + name.substr(1);
  
      evt.initEvent(name, true, true);
  
      evt.to = rootEl;
      evt.from = fromEl || rootEl;
      evt.item = targetEl || rootEl;
      evt.clone = cloneEl;
  
      evt.oldIndex = startIndex;
      evt.newIndex = newIndex;
  
      rootEl.dispatchEvent(evt);
  
      if (options[onName]) {
        options[onName].call(sortable, evt);
      }
    }
  
    function _onMove(fromEl, toEl, dragEl, dragRect, targetEl, targetRect, originalEvt, willInsertAfter) {
      var evt,
        sortable = fromEl[expando],
        onMoveFn = sortable.options.onMove,
        retVal;
  
      evt = document.createEvent("Event");
      evt.initEvent("move", true, true);
  
      evt.to = toEl;
      evt.from = fromEl;
      evt.dragged = dragEl;
      evt.draggedRect = dragRect;
      evt.related = targetEl || toEl;
      evt.relatedRect = targetRect || toEl.getBoundingClientRect();
      evt.willInsertAfter = willInsertAfter;
  
      fromEl.dispatchEvent(evt);
  
      if (onMoveFn) {
        retVal = onMoveFn.call(sortable, evt, originalEvt);
      }
  
      return retVal;
    }
  
    function _disableDraggable(el) {
      el.draggable = false;
    }
  
    function _unsilent() {
      _silent = false;
    }
  
    /** @returns {HTMLElement|false} */
    function _ghostIsLast(el, evt) {
      var lastEl = el.lastElementChild,
        rect = lastEl.getBoundingClientRect();
  
      // 5 â€” min delta
      // abs â€” Ð½ÐµÐ»ÑŒÐ·Ñ Ð´Ð¾Ð±Ð°Ð²Ð»ÑÑ‚ÑŒ, Ð° Ñ‚Ð¾ Ð³Ð»ÑŽÐºÐ¸ Ð¿Ñ€Ð¸ Ð½Ð°Ð²ÐµÐ´ÐµÐ½Ð¸Ð¸ ÑÐ²ÐµÑ€Ñ…Ñƒ
      return evt.clientY - (rect.top + rect.height) > 5 || evt.clientX - (rect.left + rect.width) > 5;
    }
  
    /**
     * Generate id
     * @param   {HTMLElement} el
     * @returns {String}
     * @private
     */
    function _generateId(el) {
      var str = el.tagName + el.className + el.src + el.href + el.textContent,
        i = str.length,
        sum = 0;
  
      while (i--) {
        sum += str.charCodeAt(i);
      }
  
      return sum.toString(36);
    }
  
    /**
     * Returns the index of an element within its parent for a selected set of
     * elements
     * @param  {HTMLElement} el
     * @param  {selector} selector
     * @return {number}
     */
    function _index(el, selector) {
      var index = 0;
  
      if (!el || !el.parentNode) {
        return -1;
      }
  
      while (el && (el = el.previousElementSibling)) {
        if (el.nodeName.toUpperCase() !== "TEMPLATE" && (selector === ">*" || _matches(el, selector))) {
          index++;
        }
      }
  
      return index;
    }
  
    function _matches(/**HTMLElement*/ el, /**String*/ selector) {
      if (el) {
        selector = selector.split(".");
  
        var tag = selector.shift().toUpperCase(),
          re = new RegExp("\\s(" + selector.join("|") + ")(?=\\s)", "g");
  
        return (
          (tag === "" || el.nodeName.toUpperCase() == tag) &&
          (!selector.length || ((" " + el.className + " ").match(re) || []).length == selector.length)
        );
      }
  
      return false;
    }
  
    function _throttle(callback, ms) {
      var args, _this;
  
      return function () {
        if (args === void 0) {
          args = arguments;
          _this = this;
  
          setTimeout(function () {
            if (args.length === 1) {
              callback.call(_this, args[0]);
            } else {
              callback.apply(_this, args);
            }
  
            args = void 0;
          }, ms);
        }
      };
    }
  
    function _extend(dst, src) {
      if (dst && src) {
        for (var key in src) {
          if (src.hasOwnProperty(key)) {
            dst[key] = src[key];
          }
        }
      }
  
      return dst;
    }
  
    function _clone(el) {
      return $ ? $(el).clone(true)[0] : Polymer && Polymer.dom ? Polymer.dom(el).cloneNode(true) : el.cloneNode(true);
    }
  
    function _saveInputCheckedState(root) {
      var inputs = root.getElementsByTagName("input");
      var idx = inputs.length;
  
      while (idx--) {
        var el = inputs[idx];
        el.checked && savedInputChecked.push(el);
      }
    }
  
    // Fixed #973:
    _on(document, "touchmove", function (evt) {
      if (Sortable.active) {
        evt.preventDefault();
      }
    });
  
    try {
      window.addEventListener(
        "test",
        null,
        Object.defineProperty({}, "passive", {
          get: function () {
            captureMode = {
              capture: false,
              passive: false
            };
          }
        })
      );
    } catch (err) {}
  
    // Export utils
    Sortable.utils = {
      on: _on,
      off: _off,
      css: _css,
      find: _find,
      is: function (el, selector) {
        return !!_closest(el, selector, el);
      },
      extend: _extend,
      throttle: _throttle,
      closest: _closest,
      toggleClass: _toggleClass,
      clone: _clone,
      index: _index
    };
  
    /**
     * Create sortable instance
     * @param {HTMLElement}  el
     * @param {Object}      [options]
     */
    Sortable.create = function (el, options) {
      return new Sortable(el, options);
    };
  
    // Export
    Sortable.version = "1.6.1";
    return Sortable;
  });
  /*
   * angular-ui-bootstrap
   * http://angular-ui.github.io/bootstrap/
  
   * Version: 2.5.6 - 2017-10-14
   * License: MIT
   */
  angular.module("ui.bootstrap", [
    "ui.bootstrap.collapse",
    "ui.bootstrap.tabindex",
    "ui.bootstrap.accordion",
    "ui.bootstrap.alert",
    "ui.bootstrap.buttons",
    "ui.bootstrap.carousel",
    "ui.bootstrap.dateparser",
    "ui.bootstrap.isClass",
    "ui.bootstrap.datepicker",
    "ui.bootstrap.position",
    "ui.bootstrap.datepickerPopup",
    "ui.bootstrap.debounce",
    "ui.bootstrap.multiMap",
    "ui.bootstrap.dropdown",
    "ui.bootstrap.stackedMap",
    "ui.bootstrap.modal",
    "ui.bootstrap.paging",
    "ui.bootstrap.pager",
    "ui.bootstrap.pagination",
    "ui.bootstrap.tooltip",
    "ui.bootstrap.popover",
    "ui.bootstrap.progressbar",
    "ui.bootstrap.rating",
    "ui.bootstrap.tabs",
    "ui.bootstrap.timepicker",
    "ui.bootstrap.typeahead"
  ]);
  angular
    .module("ui.bootstrap.collapse", [])
  
    .directive("uibCollapse", [
      "$animate",
      "$q",
      "$parse",
      "$injector",
      function ($animate, $q, $parse, $injector) {
        var $animateCss = $injector.has("$animateCss") ? $injector.get("$animateCss") : null;
        return {
          link: function (scope, element, attrs) {
            var expandingExpr = $parse(attrs.expanding),
              expandedExpr = $parse(attrs.expanded),
              collapsingExpr = $parse(attrs.collapsing),
              collapsedExpr = $parse(attrs.collapsed),
              horizontal = false,
              css = {},
              cssTo = {};
  
            init();
  
            function init() {
              horizontal = !!("horizontal" in attrs);
              if (horizontal) {
                css = {
                  width: ""
                };
                cssTo = { width: "0" };
              } else {
                css = {
                  height: ""
                };
                cssTo = { height: "0" };
              }
              if (!scope.$eval(attrs.uibCollapse)) {
                element
                  .addClass("in")
                  .addClass("collapse")
                  .attr("aria-expanded", true)
                  .attr("aria-hidden", false)
                  .css(css);
              }
            }
  
            function getScrollFromElement(element) {
              if (horizontal) {
                return { width: element.scrollWidth + "px" };
              }
              return { height: element.scrollHeight + "px" };
            }
  
            function expand() {
              if (element.hasClass("collapse") && element.hasClass("in")) {
                return;
              }
  
              $q.resolve(expandingExpr(scope)).then(function () {
                element
                  .removeClass("collapse")
                  .addClass("collapsing")
                  .attr("aria-expanded", true)
                  .attr("aria-hidden", false);
  
                if ($animateCss) {
                  $animateCss(element, {
                    addClass: "in",
                    easing: "ease",
                    css: {
                      overflow: "hidden"
                    },
                    to: getScrollFromElement(element[0])
                  })
                    .start()
                    ["finally"](expandDone);
                } else {
                  $animate
                    .addClass(element, "in", {
                      css: {
                        overflow: "hidden"
                      },
                      to: getScrollFromElement(element[0])
                    })
                    .then(expandDone);
                }
              }, angular.noop);
            }
  
            function expandDone() {
              element.removeClass("collapsing").addClass("collapse").css(css);
              expandedExpr(scope);
            }
  
            function collapse() {
              if (!element.hasClass("collapse") && !element.hasClass("in")) {
                return collapseDone();
              }
  
              $q.resolve(collapsingExpr(scope)).then(function () {
                element
                  // IMPORTANT: The width must be set before adding "collapsing" class.
                  // Otherwise, the browser attempts to animate from width 0 (in
                  // collapsing class) to the given width here.
                  .css(getScrollFromElement(element[0]))
                  // initially all panel collapse have the collapse class, this removal
                  // prevents the animation from jumping to collapsed state
                  .removeClass("collapse")
                  .addClass("collapsing")
                  .attr("aria-expanded", false)
                  .attr("aria-hidden", true);
  
                if ($animateCss) {
                  $animateCss(element, {
                    removeClass: "in",
                    to: cssTo
                  })
                    .start()
                    ["finally"](collapseDone);
                } else {
                  $animate
                    .removeClass(element, "in", {
                      to: cssTo
                    })
                    .then(collapseDone);
                }
              }, angular.noop);
            }
  
            function collapseDone() {
              element.css(cssTo); // Required so that collapse works when animation is disabled
              element.removeClass("collapsing").addClass("collapse");
              collapsedExpr(scope);
            }
  
            scope.$watch(attrs.uibCollapse, function (shouldCollapse) {
              if (shouldCollapse) {
                collapse();
              } else {
                expand();
              }
            });
          }
        };
      }
    ]);
  
  angular
    .module("ui.bootstrap.tabindex", [])
  
    .directive("uibTabindexToggle", function () {
      return {
        restrict: "A",
        link: function (scope, elem, attrs) {
          attrs.$observe("disabled", function (disabled) {
            attrs.$set("tabindex", disabled ? -1 : null);
          });
        }
      };
    });
  
  angular
    .module("ui.bootstrap.accordion", ["ui.bootstrap.collapse", "ui.bootstrap.tabindex"])
  
    .constant("uibAccordionConfig", {
      closeOthers: true
    })
  
    .controller("UibAccordionController", [
      "$scope",
      "$attrs",
      "uibAccordionConfig",
      function ($scope, $attrs, accordionConfig) {
        // This array keeps track of the accordion groups
        this.groups = [];
  
        // Ensure that all the groups in this accordion are closed, unless close-others explicitly says not to
        this.closeOthers = function (openGroup) {
          var closeOthers = angular.isDefined($attrs.closeOthers)
            ? $scope.$eval($attrs.closeOthers)
            : accordionConfig.closeOthers;
          if (closeOthers) {
            angular.forEach(this.groups, function (group) {
              if (group !== openGroup) {
                group.isOpen = false;
              }
            });
          }
        };
  
        // This is called from the accordion-group directive to add itself to the accordion
        this.addGroup = function (groupScope) {
          var that = this;
          this.groups.push(groupScope);
  
          groupScope.$on("$destroy", function (event) {
            that.removeGroup(groupScope);
          });
        };
  
        // This is called from the accordion-group directive when to remove itself
        this.removeGroup = function (group) {
          var index = this.groups.indexOf(group);
          if (index !== -1) {
            this.groups.splice(index, 1);
          }
        };
      }
    ])
  
    // The accordion directive simply sets up the directive controller
    // and adds an accordion CSS class to itself element.
    .directive("uibAccordion", function () {
      return {
        controller: "UibAccordionController",
        controllerAs: "accordion",
        transclude: true,
        templateUrl: function (element, attrs) {
          return attrs.templateUrl || "uib/template/accordion/accordion.html";
        }
      };
    })
  
    // The accordion-group directive indicates a block of html that will expand and collapse in an accordion
    .directive("uibAccordionGroup", function () {
      return {
        require: "^uibAccordion", // We need this directive to be inside an accordion
        transclude: true, // It transcludes the contents of the directive into the template
        restrict: "A",
        templateUrl: function (element, attrs) {
          return attrs.templateUrl || "uib/template/accordion/accordion-group.html";
        },
        scope: {
          heading: "@", // Interpolate the heading attribute onto this scope
          panelClass: "@?", // Ditto with panelClass
          isOpen: "=?",
          isDisabled: "=?"
        },
        controller: function () {
          this.setHeading = function (element) {
            this.heading = element;
          };
        },
        link: function (scope, element, attrs, accordionCtrl) {
          element.addClass("panel");
          accordionCtrl.addGroup(scope);
  
          scope.openClass = attrs.openClass || "panel-open";
          scope.panelClass = attrs.panelClass || "panel-default";
          scope.$watch("isOpen", function (value) {
            element.toggleClass(scope.openClass, !!value);
            if (value) {
              accordionCtrl.closeOthers(scope);
            }
          });
  
          scope.toggleOpen = function ($event) {
            if (!scope.isDisabled) {
              if (!$event || $event.which === 32) {
                scope.isOpen = !scope.isOpen;
              }
            }
          };
  
          var id = "accordiongroup-" + scope.$id + "-" + Math.floor(Math.random() * 10000);
          scope.headingId = id + "-tab";
          scope.panelId = id + "-panel";
        }
      };
    })
  
    // Use accordion-heading below an accordion-group to provide a heading containing HTML
    .directive("uibAccordionHeading", function () {
      return {
        transclude: true, // Grab the contents to be used as the heading
        template: "", // In effect remove this element!
        replace: true,
        require: "^uibAccordionGroup",
        link: function (scope, element, attrs, accordionGroupCtrl, transclude) {
          // Pass the heading to the accordion-group controller
          // so that it can be transcluded into the right place in the template
          // [The second parameter to transclude causes the elements to be cloned so that they work in ng-repeat]
          accordionGroupCtrl.setHeading(transclude(scope, angular.noop));
        }
      };
    })
  
    // Use in the accordion-group template to indicate where you want the heading to be transcluded
    // You must provide the property on the accordion-group controller that will hold the transcluded element
    .directive("uibAccordionTransclude", function () {
      return {
        require: "^uibAccordionGroup",
        link: function (scope, element, attrs, controller) {
          scope.$watch(
            function () {
              return controller[attrs.uibAccordionTransclude];
            },
            function (heading) {
              if (heading) {
                var elem = angular.element(element[0].querySelector(getHeaderSelectors()));
                elem.html("");
                elem.append(heading);
              }
            }
          );
        }
      };
  
      function getHeaderSelectors() {
        return (
          "uib-accordion-header," +
          "data-uib-accordion-header," +
          "x-uib-accordion-header," +
          "uib\\:accordion-header," +
          "[uib-accordion-header]," +
          "[data-uib-accordion-header]," +
          "[x-uib-accordion-header]"
        );
      }
    });
  
  angular
    .module("ui.bootstrap.alert", [])
  
    .controller("UibAlertController", [
      "$scope",
      "$element",
      "$attrs",
      "$interpolate",
      "$timeout",
      function ($scope, $element, $attrs, $interpolate, $timeout) {
        $scope.closeable = !!$attrs.close;
        $element.addClass("alert");
        $attrs.$set("role", "alert");
        if ($scope.closeable) {
          $element.addClass("alert-dismissible");
        }
  
        var dismissOnTimeout = angular.isDefined($attrs.dismissOnTimeout)
          ? $interpolate($attrs.dismissOnTimeout)($scope.$parent)
          : null;
  
        if (dismissOnTimeout) {
          $timeout(function () {
            $scope.close();
          }, parseInt(dismissOnTimeout, 10));
        }
      }
    ])
  
    .directive("uibAlert", function () {
      return {
        controller: "UibAlertController",
        controllerAs: "alert",
        restrict: "A",
        templateUrl: function (element, attrs) {
          return attrs.templateUrl || "uib/template/alert/alert.html";
        },
        transclude: true,
        scope: {
          close: "&"
        }
      };
    });
  
  angular
    .module("ui.bootstrap.buttons", [])
  
    .constant("uibButtonConfig", {
      activeClass: "active",
      toggleEvent: "click"
    })
  
    .controller("UibButtonsController", [
      "uibButtonConfig",
      function (buttonConfig) {
        this.activeClass = buttonConfig.activeClass || "active";
        this.toggleEvent = buttonConfig.toggleEvent || "click";
      }
    ])
  
    .directive("uibBtnRadio", [
      "$parse",
      function ($parse) {
        return {
          require: ["uibBtnRadio", "ngModel"],
          controller: "UibButtonsController",
          controllerAs: "buttons",
          link: function (scope, element, attrs, ctrls) {
            var buttonsCtrl = ctrls[0],
              ngModelCtrl = ctrls[1];
            var uncheckableExpr = $parse(attrs.uibUncheckable);
  
            element.find("input").css({ display: "none" });
  
            //model -> UI
            ngModelCtrl.$render = function () {
              element.toggleClass(
                buttonsCtrl.activeClass,
                angular.equals(ngModelCtrl.$modelValue, scope.$eval(attrs.uibBtnRadio))
              );
            };
  
            //ui->model
            element.on(buttonsCtrl.toggleEvent, function () {
              if (attrs.disabled) {
                return;
              }
  
              var isActive = element.hasClass(buttonsCtrl.activeClass);
  
              if (!isActive || angular.isDefined(attrs.uncheckable)) {
                scope.$apply(function () {
                  ngModelCtrl.$setViewValue(isActive ? null : scope.$eval(attrs.uibBtnRadio));
                  ngModelCtrl.$render();
                });
              }
            });
  
            if (attrs.uibUncheckable) {
              scope.$watch(uncheckableExpr, function (uncheckable) {
                attrs.$set("uncheckable", uncheckable ? "" : undefined);
              });
            }
          }
        };
      }
    ])
  
    .directive("uibBtnCheckbox", function () {
      return {
        require: ["uibBtnCheckbox", "ngModel"],
        controller: "UibButtonsController",
        controllerAs: "button",
        link: function (scope, element, attrs, ctrls) {
          var buttonsCtrl = ctrls[0],
            ngModelCtrl = ctrls[1];
  
          element.find("input").css({ display: "none" });
  
          function getTrueValue() {
            return getCheckboxValue(attrs.btnCheckboxTrue, true);
          }
  
          function getFalseValue() {
            return getCheckboxValue(attrs.btnCheckboxFalse, false);
          }
  
          function getCheckboxValue(attribute, defaultValue) {
            return angular.isDefined(attribute) ? scope.$eval(attribute) : defaultValue;
          }
  
          //model -> UI
          ngModelCtrl.$render = function () {
            element.toggleClass(buttonsCtrl.activeClass, angular.equals(ngModelCtrl.$modelValue, getTrueValue()));
          };
  
          //ui->model
          element.on(buttonsCtrl.toggleEvent, function () {
            if (attrs.disabled) {
              return;
            }
  
            scope.$apply(function () {
              ngModelCtrl.$setViewValue(element.hasClass(buttonsCtrl.activeClass) ? getFalseValue() : getTrueValue());
              ngModelCtrl.$render();
            });
          });
        }
      };
    });
  
  angular
    .module("ui.bootstrap.carousel", [])
  
    .controller("UibCarouselController", [
      "$scope",
      "$element",
      "$interval",
      "$timeout",
      "$animate",
      function ($scope, $element, $interval, $timeout, $animate) {
        var self = this,
          slides = (self.slides = $scope.slides = []),
          SLIDE_DIRECTION = "uib-slideDirection",
          currentIndex = $scope.active,
          currentInterval,
          isPlaying;
  
        var destroyed = false;
        $element.addClass("carousel");
  
        self.addSlide = function (slide, element) {
          slides.push({
            slide: slide,
            element: element
          });
          slides.sort(function (a, b) {
            return +a.slide.index - +b.slide.index;
          });
          //if this is the first slide or the slide is set to active, select it
          if (slide.index === $scope.active || (slides.length === 1 && !angular.isNumber($scope.active))) {
            if ($scope.$currentTransition) {
              $scope.$currentTransition = null;
            }
  
            currentIndex = slide.index;
            $scope.active = slide.index;
            setActive(currentIndex);
            self.select(slides[findSlideIndex(slide)]);
            if (slides.length === 1) {
              $scope.play();
            }
          }
        };
  
        self.getCurrentIndex = function () {
          for (var i = 0; i < slides.length; i++) {
            if (slides[i].slide.index === currentIndex) {
              return i;
            }
          }
        };
  
        self.next = $scope.next = function () {
          var newIndex = (self.getCurrentIndex() + 1) % slides.length;
  
          if (newIndex === 0 && $scope.noWrap()) {
            $scope.pause();
            return;
          }
  
          return self.select(slides[newIndex], "next");
        };
  
        self.prev = $scope.prev = function () {
          var newIndex = self.getCurrentIndex() - 1 < 0 ? slides.length - 1 : self.getCurrentIndex() - 1;
  
          if ($scope.noWrap() && newIndex === slides.length - 1) {
            $scope.pause();
            return;
          }
  
          return self.select(slides[newIndex], "prev");
        };
  
        self.removeSlide = function (slide) {
          var index = findSlideIndex(slide);
  
          //get the index of the slide inside the carousel
          slides.splice(index, 1);
          if (slides.length > 0 && currentIndex === index) {
            if (index >= slides.length) {
              currentIndex = slides.length - 1;
              $scope.active = currentIndex;
              setActive(currentIndex);
              self.select(slides[slides.length - 1]);
            } else {
              currentIndex = index;
              $scope.active = currentIndex;
              setActive(currentIndex);
              self.select(slides[index]);
            }
          } else if (currentIndex > index) {
            currentIndex--;
            $scope.active = currentIndex;
          }
  
          //clean the active value when no more slide
          if (slides.length === 0) {
            currentIndex = null;
            $scope.active = null;
          }
        };
  
        /* direction: "prev" or "next" */
        self.select = $scope.select = function (nextSlide, direction) {
          var nextIndex = findSlideIndex(nextSlide.slide);
          //Decide direction if it's not given
          if (direction === undefined) {
            direction = nextIndex > self.getCurrentIndex() ? "next" : "prev";
          }
          //Prevent this user-triggered transition from occurring if there is already one in progress
          if (nextSlide.slide.index !== currentIndex && !$scope.$currentTransition) {
            goNext(nextSlide.slide, nextIndex, direction);
          }
        };
  
        /* Allow outside people to call indexOf on slides array */
        $scope.indexOfSlide = function (slide) {
          return +slide.slide.index;
        };
  
        $scope.isActive = function (slide) {
          return $scope.active === slide.slide.index;
        };
  
        $scope.isPrevDisabled = function () {
          return $scope.active === 0 && $scope.noWrap();
        };
  
        $scope.isNextDisabled = function () {
          return $scope.active === slides.length - 1 && $scope.noWrap();
        };
  
        $scope.pause = function () {
          if (!$scope.noPause) {
            isPlaying = false;
            resetTimer();
          }
        };
  
        $scope.play = function () {
          if (!isPlaying) {
            isPlaying = true;
            restartTimer();
          }
        };
  
        $element.on("mouseenter", $scope.pause);
        $element.on("mouseleave", $scope.play);
  
        $scope.$on("$destroy", function () {
          destroyed = true;
          resetTimer();
        });
  
        $scope.$watch("noTransition", function (noTransition) {
          $animate.enabled($element, !noTransition);
        });
  
        $scope.$watch("interval", restartTimer);
  
        $scope.$watchCollection("slides", resetTransition);
  
        $scope.$watch("active", function (index) {
          if (angular.isNumber(index) && currentIndex !== index) {
            for (var i = 0; i < slides.length; i++) {
              if (slides[i].slide.index === index) {
                index = i;
                break;
              }
            }
  
            var slide = slides[index];
            if (slide) {
              setActive(index);
              self.select(slides[index]);
              currentIndex = index;
            }
          }
        });
  
        function getSlideByIndex(index) {
          for (var i = 0, l = slides.length; i < l; ++i) {
            if (slides[i].index === index) {
              return slides[i];
            }
          }
        }
  
        function setActive(index) {
          for (var i = 0; i < slides.length; i++) {
            slides[i].slide.active = i === index;
          }
        }
  
        function goNext(slide, index, direction) {
          if (destroyed) {
            return;
          }
  
          angular.extend(slide, { direction: direction });
          angular.extend(slides[currentIndex].slide || {}, { direction: direction });
          if (
            $animate.enabled($element) &&
            !$scope.$currentTransition &&
            slides[index].element &&
            self.slides.length > 1
          ) {
            slides[index].element.data(SLIDE_DIRECTION, slide.direction);
            var currentIdx = self.getCurrentIndex();
  
            if (angular.isNumber(currentIdx) && slides[currentIdx].element) {
              slides[currentIdx].element.data(SLIDE_DIRECTION, slide.direction);
            }
  
            $scope.$currentTransition = true;
            $animate.on("addClass", slides[index].element, function (element, phase) {
              if (phase === "close") {
                $scope.$currentTransition = null;
                $animate.off("addClass", element);
              }
            });
          }
  
          $scope.active = slide.index;
          currentIndex = slide.index;
          setActive(index);
  
          //every time you change slides, reset the timer
          restartTimer();
        }
  
        function findSlideIndex(slide) {
          for (var i = 0; i < slides.length; i++) {
            if (slides[i].slide === slide) {
              return i;
            }
          }
        }
  
        function resetTimer() {
          if (currentInterval) {
            $interval.cancel(currentInterval);
            currentInterval = null;
          }
        }
  
        function resetTransition(slides) {
          if (!slides.length) {
            $scope.$currentTransition = null;
          }
        }
  
        function restartTimer() {
          resetTimer();
          var interval = +$scope.interval;
          if (!isNaN(interval) && interval > 0) {
            currentInterval = $interval(timerFn, interval);
          }
        }
  
        function timerFn() {
          var interval = +$scope.interval;
          if (isPlaying && !isNaN(interval) && interval > 0 && slides.length) {
            $scope.next();
          } else {
            $scope.pause();
          }
        }
      }
    ])
  
    .directive("uibCarousel", function () {
      return {
        transclude: true,
        controller: "UibCarouselController",
        controllerAs: "carousel",
        restrict: "A",
        templateUrl: function (element, attrs) {
          return attrs.templateUrl || "uib/template/carousel/carousel.html";
        },
        scope: {
          active: "=",
          interval: "=",
          noTransition: "=",
          noPause: "=",
          noWrap: "&"
        }
      };
    })
  
    .directive("uibSlide", [
      "$animate",
      function ($animate) {
        return {
          require: "^uibCarousel",
          restrict: "A",
          transclude: true,
          templateUrl: function (element, attrs) {
            return attrs.templateUrl || "uib/template/carousel/slide.html";
          },
          scope: {
            actual: "=?",
            index: "=?"
          },
          link: function (scope, element, attrs, carouselCtrl) {
            element.addClass("item");
            carouselCtrl.addSlide(scope, element);
            //when the scope is destroyed then remove the slide from the current slides array
            scope.$on("$destroy", function () {
              carouselCtrl.removeSlide(scope);
            });
  
            scope.$watch("active", function (active) {
              $animate[active ? "addClass" : "removeClass"](element, "active");
            });
          }
        };
      }
    ])
  
    .animation(".item", [
      "$animateCss",
      function ($animateCss) {
        var SLIDE_DIRECTION = "uib-slideDirection";
  
        function removeClass(element, className, callback) {
          element.removeClass(className);
          if (callback) {
            callback();
          }
        }
  
        return {
          beforeAddClass: function (element, className, done) {
            if (className === "active") {
              var stopped = false;
              var direction = element.data(SLIDE_DIRECTION);
              var directionClass = direction === "next" ? "left" : "right";
              var removeClassFn = removeClass.bind(this, element, directionClass + " " + direction, done);
              element.addClass(direction);
  
              $animateCss(element, { addClass: directionClass }).start().done(removeClassFn);
  
              return function () {
                stopped = true;
              };
            }
            done();
          },
          beforeRemoveClass: function (element, className, done) {
            if (className === "active") {
              var stopped = false;
              var direction = element.data(SLIDE_DIRECTION);
              var directionClass = direction === "next" ? "left" : "right";
              var removeClassFn = removeClass.bind(this, element, directionClass, done);
  
              $animateCss(element, { addClass: directionClass }).start().done(removeClassFn);
  
              return function () {
                stopped = true;
              };
            }
            done();
          }
        };
      }
    ]);
  
  angular
    .module("ui.bootstrap.dateparser", [])
  
    .service("uibDateParser", [
      "$log",
      "$locale",
      "dateFilter",
      "orderByFilter",
      "filterFilter",
      function ($log, $locale, dateFilter, orderByFilter, filterFilter) {
        // Pulled from https://github.com/mbostock/d3/blob/master/src/format/requote.js
        var SPECIAL_CHARACTERS_REGEXP = /[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;
  
        var localeId;
        var formatCodeToRegex;
  
        this.init = function () {
          localeId = $locale.id;
  
          this.parsers = {};
          this.formatters = {};
  
          formatCodeToRegex = [
            {
              key: "yyyy",
              regex: "\\d{4}",
              apply: function (value) {
                this.year = +value;
              },
              formatter: function (date) {
                var _date = new Date();
                _date.setFullYear(Math.abs(date.getFullYear()));
                return dateFilter(_date, "yyyy");
              }
            },
            {
              key: "yy",
              regex: "\\d{2}",
              apply: function (value) {
                value = +value;
                this.year = value < 69 ? value + 2000 : value + 1900;
              },
              formatter: function (date) {
                var _date = new Date();
                _date.setFullYear(Math.abs(date.getFullYear()));
                return dateFilter(_date, "yy");
              }
            },
            {
              key: "y",
              regex: "\\d{1,4}",
              apply: function (value) {
                this.year = +value;
              },
              formatter: function (date) {
                var _date = new Date();
                _date.setFullYear(Math.abs(date.getFullYear()));
                return dateFilter(_date, "y");
              }
            },
            {
              key: "M!",
              regex: "0?[1-9]|1[0-2]",
              apply: function (value) {
                this.month = value - 1;
              },
              formatter: function (date) {
                var value = date.getMonth();
                if (/^[0-9]$/.test(value)) {
                  return dateFilter(date, "MM");
                }
  
                return dateFilter(date, "M");
              }
            },
            {
              key: "MMMM",
              regex: $locale.DATETIME_FORMATS.MONTH.join("|"),
              apply: function (value) {
                this.month = $locale.DATETIME_FORMATS.MONTH.indexOf(value);
              },
              formatter: function (date) {
                return dateFilter(date, "MMMM");
              }
            },
            {
              key: "MMM",
              regex: $locale.DATETIME_FORMATS.SHORTMONTH.join("|"),
              apply: function (value) {
                this.month = $locale.DATETIME_FORMATS.SHORTMONTH.indexOf(value);
              },
              formatter: function (date) {
                return dateFilter(date, "MMM");
              }
            },
            {
              key: "MM",
              regex: "0[1-9]|1[0-2]",
              apply: function (value) {
                this.month = value - 1;
              },
              formatter: function (date) {
                return dateFilter(date, "MM");
              }
            },
            {
              key: "M",
              regex: "[1-9]|1[0-2]",
              apply: function (value) {
                this.month = value - 1;
              },
              formatter: function (date) {
                return dateFilter(date, "M");
              }
            },
            {
              key: "d!",
              regex: "[0-2]?[0-9]{1}|3[0-1]{1}",
              apply: function (value) {
                this.date = +value;
              },
              formatter: function (date) {
                var value = date.getDate();
                if (/^[1-9]$/.test(value)) {
                  return dateFilter(date, "dd");
                }
  
                return dateFilter(date, "d");
              }
            },
            {
              key: "dd",
              regex: "[0-2][0-9]{1}|3[0-1]{1}",
              apply: function (value) {
                this.date = +value;
              },
              formatter: function (date) {
                return dateFilter(date, "dd");
              }
            },
            {
              key: "d",
              regex: "[1-2]?[0-9]{1}|3[0-1]{1}",
              apply: function (value) {
                this.date = +value;
              },
              formatter: function (date) {
                return dateFilter(date, "d");
              }
            },
            {
              key: "EEEE",
              regex: $locale.DATETIME_FORMATS.DAY.join("|"),
              formatter: function (date) {
                return dateFilter(date, "EEEE");
              }
            },
            {
              key: "EEE",
              regex: $locale.DATETIME_FORMATS.SHORTDAY.join("|"),
              formatter: function (date) {
                return dateFilter(date, "EEE");
              }
            },
            {
              key: "HH",
              regex: "(?:0|1)[0-9]|2[0-3]",
              apply: function (value) {
                this.hours = +value;
              },
              formatter: function (date) {
                return dateFilter(date, "HH");
              }
            },
            {
              key: "hh",
              regex: "0[0-9]|1[0-2]",
              apply: function (value) {
                this.hours = +value;
              },
              formatter: function (date) {
                return dateFilter(date, "hh");
              }
            },
            {
              key: "H",
              regex: "1?[0-9]|2[0-3]",
              apply: function (value) {
                this.hours = +value;
              },
              formatter: function (date) {
                return dateFilter(date, "H");
              }
            },
            {
              key: "h",
              regex: "[0-9]|1[0-2]",
              apply: function (value) {
                this.hours = +value;
              },
              formatter: function (date) {
                return dateFilter(date, "h");
              }
            },
            {
              key: "mm",
              regex: "[0-5][0-9]",
              apply: function (value) {
                this.minutes = +value;
              },
              formatter: function (date) {
                return dateFilter(date, "mm");
              }
            },
            {
              key: "m",
              regex: "[0-9]|[1-5][0-9]",
              apply: function (value) {
                this.minutes = +value;
              },
              formatter: function (date) {
                return dateFilter(date, "m");
              }
            },
            {
              key: "sss",
              regex: "[0-9][0-9][0-9]",
              apply: function (value) {
                this.milliseconds = +value;
              },
              formatter: function (date) {
                return dateFilter(date, "sss");
              }
            },
            {
              key: "ss",
              regex: "[0-5][0-9]",
              apply: function (value) {
                this.seconds = +value;
              },
              formatter: function (date) {
                return dateFilter(date, "ss");
              }
            },
            {
              key: "s",
              regex: "[0-9]|[1-5][0-9]",
              apply: function (value) {
                this.seconds = +value;
              },
              formatter: function (date) {
                return dateFilter(date, "s");
              }
            },
            {
              key: "a",
              regex: $locale.DATETIME_FORMATS.AMPMS.join("|"),
              apply: function (value) {
                if (this.hours === 12) {
                  this.hours = 0;
                }
  
                if (value === "PM") {
                  this.hours += 12;
                }
              },
              formatter: function (date) {
                return dateFilter(date, "a");
              }
            },
            {
              key: "Z",
              regex: "[+-]\\d{4}",
              apply: function (value) {
                var matches = value.match(/([+-])(\d{2})(\d{2})/),
                  sign = matches[1],
                  hours = matches[2],
                  minutes = matches[3];
                this.hours += toInt(sign + hours);
                this.minutes += toInt(sign + minutes);
              },
              formatter: function (date) {
                return dateFilter(date, "Z");
              }
            },
            {
              key: "ww",
              regex: "[0-4][0-9]|5[0-3]",
              formatter: function (date) {
                return dateFilter(date, "ww");
              }
            },
            {
              key: "w",
              regex: "[0-9]|[1-4][0-9]|5[0-3]",
              formatter: function (date) {
                return dateFilter(date, "w");
              }
            },
            {
              key: "GGGG",
              regex: $locale.DATETIME_FORMATS.ERANAMES.join("|").replace(/\s/g, "\\s"),
              formatter: function (date) {
                return dateFilter(date, "GGGG");
              }
            },
            {
              key: "GGG",
              regex: $locale.DATETIME_FORMATS.ERAS.join("|"),
              formatter: function (date) {
                return dateFilter(date, "GGG");
              }
            },
            {
              key: "GG",
              regex: $locale.DATETIME_FORMATS.ERAS.join("|"),
              formatter: function (date) {
                return dateFilter(date, "GG");
              }
            },
            {
              key: "G",
              regex: $locale.DATETIME_FORMATS.ERAS.join("|"),
              formatter: function (date) {
                return dateFilter(date, "G");
              }
            }
          ];
  
          if (angular.version.major >= 1 && angular.version.minor > 4) {
            formatCodeToRegex.push({
              key: "LLLL",
              regex: $locale.DATETIME_FORMATS.STANDALONEMONTH.join("|"),
              apply: function (value) {
                this.month = $locale.DATETIME_FORMATS.STANDALONEMONTH.indexOf(value);
              },
              formatter: function (date) {
                return dateFilter(date, "LLLL");
              }
            });
          }
        };
  
        this.init();
  
        function getFormatCodeToRegex(key) {
          return filterFilter(formatCodeToRegex, { key: key }, true)[0];
        }
  
        this.getParser = function (key) {
          var f = getFormatCodeToRegex(key);
          return (f && f.apply) || null;
        };
  
        this.overrideParser = function (key, parser) {
          var f = getFormatCodeToRegex(key);
          if (f && angular.isFunction(parser)) {
            this.parsers = {};
            f.apply = parser;
          }
        }.bind(this);
  
        function createParser(format) {
          var map = [],
            regex = format.split("");
  
          // check for literal values
          var quoteIndex = format.indexOf("'");
          if (quoteIndex > -1) {
            var inLiteral = false;
            format = format.split("");
            for (var i = quoteIndex; i < format.length; i++) {
              if (inLiteral) {
                if (format[i] === "'") {
                  if (i + 1 < format.length && format[i + 1] === "'") {
                    // escaped single quote
                    format[i + 1] = "$";
                    regex[i + 1] = "";
                  } else {
                    // end of literal
                    regex[i] = "";
                    inLiteral = false;
                  }
                }
                format[i] = "$";
              } else {
                if (format[i] === "'") {
                  // start of literal
                  format[i] = "$";
                  regex[i] = "";
                  inLiteral = true;
                }
              }
            }
  
            format = format.join("");
          }
  
          angular.forEach(formatCodeToRegex, function (data) {
            var index = format.indexOf(data.key);
  
            if (index > -1) {
              format = format.split("");
  
              regex[index] = "(" + data.regex + ")";
              format[index] = "$"; // Custom symbol to define consumed part of format
              for (var i = index + 1, n = index + data.key.length; i < n; i++) {
                regex[i] = "";
                format[i] = "$";
              }
              format = format.join("");
  
              map.push({
                index: index,
                key: data.key,
                apply: data.apply,
                matcher: data.regex
              });
            }
          });
  
          return {
            regex: new RegExp("^" + regex.join("") + "$"),
            map: orderByFilter(map, "index")
          };
        }
  
        function createFormatter(format) {
          var formatters = [];
          var i = 0;
          var formatter, literalIdx;
          while (i < format.length) {
            if (angular.isNumber(literalIdx)) {
              if (format.charAt(i) === "'") {
                if (i + 1 >= format.length || format.charAt(i + 1) !== "'") {
                  formatters.push(constructLiteralFormatter(format, literalIdx, i));
                  literalIdx = null;
                }
              } else if (i === format.length) {
                while (literalIdx < format.length) {
                  formatter = constructFormatterFromIdx(format, literalIdx);
                  formatters.push(formatter);
                  literalIdx = formatter.endIdx;
                }
              }
  
              i++;
              continue;
            }
  
            if (format.charAt(i) === "'") {
              literalIdx = i;
              i++;
              continue;
            }
  
            formatter = constructFormatterFromIdx(format, i);
  
            formatters.push(formatter.parser);
            i = formatter.endIdx;
          }
  
          return formatters;
        }
  
        function constructLiteralFormatter(format, literalIdx, endIdx) {
          return function () {
            return format.substr(literalIdx + 1, endIdx - literalIdx - 1);
          };
        }
  
        function constructFormatterFromIdx(format, i) {
          var currentPosStr = format.substr(i);
          for (var j = 0; j < formatCodeToRegex.length; j++) {
            if (new RegExp("^" + formatCodeToRegex[j].key).test(currentPosStr)) {
              var data = formatCodeToRegex[j];
              return {
                endIdx: i + data.key.length,
                parser: data.formatter
              };
            }
          }
  
          return {
            endIdx: i + 1,
            parser: function () {
              return currentPosStr.charAt(0);
            }
          };
        }
  
        this.filter = function (date, format) {
          if (!angular.isDate(date) || isNaN(date) || !format) {
            return "";
          }
  
          format = $locale.DATETIME_FORMATS[format] || format;
  
          if ($locale.id !== localeId) {
            this.init();
          }
  
          if (!this.formatters[format]) {
            this.formatters[format] = createFormatter(format);
          }
  
          var formatters = this.formatters[format];
  
          return formatters.reduce(function (str, formatter) {
            return str + formatter(date);
          }, "");
        };
  
        this.parse = function (input, format, baseDate) {
          if (!angular.isString(input) || !format) {
            return input;
          }
  
          format = $locale.DATETIME_FORMATS[format] || format;
          format = format.replace(SPECIAL_CHARACTERS_REGEXP, "\\$&");
  
          if ($locale.id !== localeId) {
            this.init();
          }
  
          if (!this.parsers[format]) {
            this.parsers[format] = createParser(format, "apply");
          }
  
          var parser = this.parsers[format],
            regex = parser.regex,
            map = parser.map,
            results = input.match(regex),
            tzOffset = false;
          if (results && results.length) {
            var fields, dt;
            if (angular.isDate(baseDate) && !isNaN(baseDate.getTime())) {
              fields = {
                year: baseDate.getFullYear(),
                month: baseDate.getMonth(),
                date: baseDate.getDate(),
                hours: baseDate.getHours(),
                minutes: baseDate.getMinutes(),
                seconds: baseDate.getSeconds(),
                milliseconds: baseDate.getMilliseconds()
              };
            } else {
              if (baseDate) {
                $log.warn("dateparser:", "baseDate is not a valid date");
              }
              fields = { year: 1900, month: 0, date: 1, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 };
            }
  
            for (var i = 1, n = results.length; i < n; i++) {
              var mapper = map[i - 1];
              if (mapper.matcher === "Z") {
                tzOffset = true;
              }
  
              if (mapper.apply) {
                mapper.apply.call(fields, results[i]);
              }
            }
  
            var datesetter = tzOffset ? Date.prototype.setUTCFullYear : Date.prototype.setFullYear;
            var timesetter = tzOffset ? Date.prototype.setUTCHours : Date.prototype.setHours;
  
            if (isValid(fields.year, fields.month, fields.date)) {
              if (angular.isDate(baseDate) && !isNaN(baseDate.getTime()) && !tzOffset) {
                dt = new Date(baseDate);
                datesetter.call(dt, fields.year, fields.month, fields.date);
                timesetter.call(dt, fields.hours, fields.minutes, fields.seconds, fields.milliseconds);
              } else {
                dt = new Date(0);
                datesetter.call(dt, fields.year, fields.month, fields.date);
                timesetter.call(
                  dt,
                  fields.hours || 0,
                  fields.minutes || 0,
                  fields.seconds || 0,
                  fields.milliseconds || 0
                );
              }
            }
  
            return dt;
          }
        };
  
        // Check if date is valid for specific month (and year for February).
        // Month: 0 = Jan, 1 = Feb, etc
        function isValid(year, month, date) {
          if (date < 1) {
            return false;
          }
  
          if (month === 1 && date > 28) {
            return date === 29 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0);
          }
  
          if (month === 3 || month === 5 || month === 8 || month === 10) {
            return date < 31;
          }
  
          return true;
        }
  
        function toInt(str) {
          return parseInt(str, 10);
        }
  
        this.toTimezone = toTimezone;
        this.fromTimezone = fromTimezone;
        this.timezoneToOffset = timezoneToOffset;
        this.addDateMinutes = addDateMinutes;
        this.convertTimezoneToLocal = convertTimezoneToLocal;
  
        function toTimezone(date, timezone) {
          return date && timezone ? convertTimezoneToLocal(date, timezone) : date;
        }
  
        function fromTimezone(date, timezone) {
          return date && timezone ? convertTimezoneToLocal(date, timezone, true) : date;
        }
  
        //https://github.com/angular/angular.js/blob/622c42169699ec07fc6daaa19fe6d224e5d2f70e/src/Angular.js#L1207
        function timezoneToOffset(timezone, fallback) {
          timezone = timezone.replace(/:/g, "");
          var requestedTimezoneOffset = Date.parse("Jan 01, 1970 00:00:00 " + timezone) / 60000;
          return isNaN(requestedTimezoneOffset) ? fallback : requestedTimezoneOffset;
        }
  
        function addDateMinutes(date, minutes) {
          date = new Date(date.getTime());
          date.setMinutes(date.getMinutes() + minutes);
          return date;
        }
  
        function convertTimezoneToLocal(date, timezone, reverse) {
          reverse = reverse ? -1 : 1;
          var dateTimezoneOffset = date.getTimezoneOffset();
          var timezoneOffset = timezoneToOffset(timezone, dateTimezoneOffset);
          return addDateMinutes(date, reverse * (timezoneOffset - dateTimezoneOffset));
        }
      }
    ]);
  
  // Avoiding use of ng-class as it creates a lot of watchers when a class is to be applied to
  // at most one element.
  angular.module("ui.bootstrap.isClass", []).directive("uibIsClass", [
    "$animate",
    function ($animate) {
      //                    11111111          22222222
      var ON_REGEXP = /^\s*([\s\S]+?)\s+on\s+([\s\S]+?)\s*$/;
      //                    11111111           22222222
      var IS_REGEXP = /^\s*([\s\S]+?)\s+for\s+([\s\S]+?)\s*$/;
  
      var dataPerTracked = {};
  
      return {
        restrict: "A",
        compile: function (tElement, tAttrs) {
          var linkedScopes = [];
          var instances = [];
          var expToData = {};
          var lastActivated = null;
          var onExpMatches = tAttrs.uibIsClass.match(ON_REGEXP);
          var onExp = onExpMatches[2];
          var expsStr = onExpMatches[1];
          var exps = expsStr.split(",");
  
          return linkFn;
  
          function linkFn(scope, element, attrs) {
            linkedScopes.push(scope);
            instances.push({
              scope: scope,
              element: element
            });
  
            exps.forEach(function (exp, k) {
              addForExp(exp, scope);
            });
  
            scope.$on("$destroy", removeScope);
          }
  
          function addForExp(exp, scope) {
            var matches = exp.match(IS_REGEXP);
            var clazz = scope.$eval(matches[1]);
            var compareWithExp = matches[2];
            var data = expToData[exp];
            if (!data) {
              var watchFn = function (compareWithVal) {
                var newActivated = null;
                instances.some(function (instance) {
                  var thisVal = instance.scope.$eval(onExp);
                  if (thisVal === compareWithVal) {
                    newActivated = instance;
                    return true;
                  }
                });
                if (data.lastActivated !== newActivated) {
                  if (data.lastActivated) {
                    $animate.removeClass(data.lastActivated.element, clazz);
                  }
                  if (newActivated) {
                    $animate.addClass(newActivated.element, clazz);
                  }
                  data.lastActivated = newActivated;
                }
              };
              expToData[exp] = data = {
                lastActivated: null,
                scope: scope,
                watchFn: watchFn,
                compareWithExp: compareWithExp,
                watcher: scope.$watch(compareWithExp, watchFn)
              };
            }
            data.watchFn(scope.$eval(compareWithExp));
          }
  
          function removeScope(e) {
            var removedScope = e.targetScope;
            var index = linkedScopes.indexOf(removedScope);
            linkedScopes.splice(index, 1);
            instances.splice(index, 1);
            if (linkedScopes.length) {
              var newWatchScope = linkedScopes[0];
              angular.forEach(expToData, function (data) {
                if (data.scope === removedScope) {
                  data.watcher = newWatchScope.$watch(data.compareWithExp, data.watchFn);
                  data.scope = newWatchScope;
                }
              });
            } else {
              expToData = {};
            }
          }
        }
      };
    }
  ]);
  angular
    .module("ui.bootstrap.datepicker", ["ui.bootstrap.dateparser", "ui.bootstrap.isClass"])
  
    .value("$datepickerSuppressError", false)
  
    .value("$datepickerLiteralWarning", true)
  
    .constant("uibDatepickerConfig", {
      datepickerMode: "day",
      formatDay: "dd",
      formatMonth: "MMMM",
      formatYear: "yyyy",
      formatDayHeader: "EEE",
      formatDayTitle: "MMMM yyyy",
      formatMonthTitle: "yyyy",
      maxDate: null,
      maxMode: "year",
      minDate: null,
      minMode: "day",
      monthColumns: 3,
      ngModelOptions: {},
      shortcutPropagation: false,
      showWeeks: true,
      yearColumns: 5,
      yearRows: 4
    })
  
    .controller("UibDatepickerController", [
      "$scope",
      "$element",
      "$attrs",
      "$parse",
      "$interpolate",
      "$locale",
      "$log",
      "dateFilter",
      "uibDatepickerConfig",
      "$datepickerLiteralWarning",
      "$datepickerSuppressError",
      "uibDateParser",
      function (
        $scope,
        $element,
        $attrs,
        $parse,
        $interpolate,
        $locale,
        $log,
        dateFilter,
        datepickerConfig,
        $datepickerLiteralWarning,
        $datepickerSuppressError,
        dateParser
      ) {
        var self = this,
          ngModelCtrl = { $setViewValue: angular.noop }, // nullModelCtrl;
          ngModelOptions = {},
          watchListeners = [];
  
        $element.addClass("uib-datepicker");
        $attrs.$set("role", "application");
  
        if (!$scope.datepickerOptions) {
          $scope.datepickerOptions = {};
        }
  
        // Modes chain
        this.modes = ["day", "month", "year"];
  
        [
          "customClass",
          "dateDisabled",
          "datepickerMode",
          "formatDay",
          "formatDayHeader",
          "formatDayTitle",
          "formatMonth",
          "formatMonthTitle",
          "formatYear",
          "maxDate",
          "maxMode",
          "minDate",
          "minMode",
          "monthColumns",
          "showWeeks",
          "shortcutPropagation",
          "startingDay",
          "yearColumns",
          "yearRows"
        ].forEach(function (key) {
          switch (key) {
            case "customClass":
            case "dateDisabled":
              $scope[key] = $scope.datepickerOptions[key] || angular.noop;
              break;
            case "datepickerMode":
              $scope.datepickerMode = angular.isDefined($scope.datepickerOptions.datepickerMode)
                ? $scope.datepickerOptions.datepickerMode
                : datepickerConfig.datepickerMode;
              break;
            case "formatDay":
            case "formatDayHeader":
            case "formatDayTitle":
            case "formatMonth":
            case "formatMonthTitle":
            case "formatYear":
              self[key] = angular.isDefined($scope.datepickerOptions[key])
                ? $interpolate($scope.datepickerOptions[key])($scope.$parent)
                : datepickerConfig[key];
              break;
            case "monthColumns":
            case "showWeeks":
            case "shortcutPropagation":
            case "yearColumns":
            case "yearRows":
              self[key] = angular.isDefined($scope.datepickerOptions[key])
                ? $scope.datepickerOptions[key]
                : datepickerConfig[key];
              break;
            case "startingDay":
              if (angular.isDefined($scope.datepickerOptions.startingDay)) {
                self.startingDay = $scope.datepickerOptions.startingDay;
              } else if (angular.isNumber(datepickerConfig.startingDay)) {
                self.startingDay = datepickerConfig.startingDay;
              } else {
                self.startingDay = ($locale.DATETIME_FORMATS.FIRSTDAYOFWEEK + 8) % 7;
              }
  
              break;
            case "maxDate":
            case "minDate":
              $scope.$watch("datepickerOptions." + key, function (value) {
                if (value) {
                  if (angular.isDate(value)) {
                    self[key] = dateParser.fromTimezone(new Date(value), ngModelOptions.getOption("timezone"));
                  } else {
                    if ($datepickerLiteralWarning) {
                      $log.warn("Literal date support has been deprecated, please switch to date object usage");
                    }
  
                    self[key] = new Date(dateFilter(value, "medium"));
                  }
                } else {
                  self[key] = datepickerConfig[key]
                    ? dateParser.fromTimezone(new Date(datepickerConfig[key]), ngModelOptions.getOption("timezone"))
                    : null;
                }
  
                self.refreshView();
              });
  
              break;
            case "maxMode":
            case "minMode":
              if ($scope.datepickerOptions[key]) {
                $scope.$watch(
                  function () {
                    return $scope.datepickerOptions[key];
                  },
                  function (value) {
                    self[key] = $scope[key] = angular.isDefined(value) ? value : $scope.datepickerOptions[key];
                    if (
                      (key === "minMode" &&
                        self.modes.indexOf($scope.datepickerOptions.datepickerMode) < self.modes.indexOf(self[key])) ||
                      (key === "maxMode" &&
                        self.modes.indexOf($scope.datepickerOptions.datepickerMode) > self.modes.indexOf(self[key]))
                    ) {
                      $scope.datepickerMode = self[key];
                      $scope.datepickerOptions.datepickerMode = self[key];
                    }
                  }
                );
              } else {
                self[key] = $scope[key] = datepickerConfig[key] || null;
              }
  
              break;
          }
        });
  
        $scope.uniqueId = "datepicker-" + $scope.$id + "-" + Math.floor(Math.random() * 10000);
  
        $scope.disabled = angular.isDefined($attrs.disabled) || false;
        if (angular.isDefined($attrs.ngDisabled)) {
          watchListeners.push(
            $scope.$parent.$watch($attrs.ngDisabled, function (disabled) {
              $scope.disabled = disabled;
              self.refreshView();
            })
          );
        }
  
        $scope.isActive = function (dateObject) {
          if (self.compare(dateObject.date, self.activeDate) === 0) {
            $scope.activeDateId = dateObject.uid;
            return true;
          }
          return false;
        };
  
        this.init = function (ngModelCtrl_) {
          ngModelCtrl = ngModelCtrl_;
          ngModelOptions = extractOptions(ngModelCtrl);
  
          if ($scope.datepickerOptions.initDate) {
            self.activeDate =
              dateParser.fromTimezone($scope.datepickerOptions.initDate, ngModelOptions.getOption("timezone")) ||
              new Date();
            $scope.$watch("datepickerOptions.initDate", function (initDate) {
              if (initDate && (ngModelCtrl.$isEmpty(ngModelCtrl.$modelValue) || ngModelCtrl.$invalid)) {
                self.activeDate = dateParser.fromTimezone(initDate, ngModelOptions.getOption("timezone"));
                self.refreshView();
              }
            });
          } else {
            self.activeDate = new Date();
          }
  
          var date = ngModelCtrl.$modelValue ? new Date(ngModelCtrl.$modelValue) : new Date();
          this.activeDate = !isNaN(date)
            ? dateParser.fromTimezone(date, ngModelOptions.getOption("timezone"))
            : dateParser.fromTimezone(new Date(), ngModelOptions.getOption("timezone"));
  
          ngModelCtrl.$render = function () {
            self.render();
          };
        };
  
        this.render = function () {
          if (ngModelCtrl.$viewValue) {
            var date = new Date(ngModelCtrl.$viewValue),
              isValid = !isNaN(date);
  
            if (isValid) {
              this.activeDate = dateParser.fromTimezone(date, ngModelOptions.getOption("timezone"));
            } else if (!$datepickerSuppressError) {
              $log.error('Datepicker directive: "ng-model" value must be a Date object');
            }
          }
          this.refreshView();
        };
  
        this.refreshView = function () {
          if (this.element) {
            $scope.selectedDt = null;
            this._refreshView();
            if ($scope.activeDt) {
              $scope.activeDateId = $scope.activeDt.uid;
            }
  
            var date = ngModelCtrl.$viewValue ? new Date(ngModelCtrl.$viewValue) : null;
            date = dateParser.fromTimezone(date, ngModelOptions.getOption("timezone"));
            ngModelCtrl.$setValidity("dateDisabled", !date || (this.element && !this.isDisabled(date)));
          }
        };
  
        this.createDateObject = function (date, format) {
          var model = ngModelCtrl.$viewValue ? new Date(ngModelCtrl.$viewValue) : null;
          model = dateParser.fromTimezone(model, ngModelOptions.getOption("timezone"));
          var today = new Date();
          today = dateParser.fromTimezone(today, ngModelOptions.getOption("timezone"));
          var time = this.compare(date, today);
          var dt = {
            date: date,
            label: dateParser.filter(date, format),
            selected: model && this.compare(date, model) === 0,
            disabled: this.isDisabled(date),
            past: time < 0,
            current: time === 0,
            future: time > 0,
            customClass: this.customClass(date) || null
          };
  
          if (model && this.compare(date, model) === 0) {
            $scope.selectedDt = dt;
          }
  
          if (self.activeDate && this.compare(dt.date, self.activeDate) === 0) {
            $scope.activeDt = dt;
          }
  
          return dt;
        };
  
        this.isDisabled = function (date) {
          return (
            $scope.disabled ||
            (this.minDate && this.compare(date, this.minDate) < 0) ||
            (this.maxDate && this.compare(date, this.maxDate) > 0) ||
            ($scope.dateDisabled && $scope.dateDisabled({ date: date, mode: $scope.datepickerMode }))
          );
        };
  
        this.customClass = function (date) {
          return $scope.customClass({ date: date, mode: $scope.datepickerMode });
        };
  
        // Split array into smaller arrays
        this.split = function (arr, size) {
          var arrays = [];
          while (arr.length > 0) {
            arrays.push(arr.splice(0, size));
          }
          return arrays;
        };
  
        $scope.select = function (date) {
          if ($scope.datepickerMode === self.minMode) {
            var dt = ngModelCtrl.$viewValue
              ? dateParser.fromTimezone(new Date(ngModelCtrl.$viewValue), ngModelOptions.getOption("timezone"))
              : new Date(0, 0, 0, 0, 0, 0, 0);
            dt.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
            dt = dateParser.toTimezone(dt, ngModelOptions.getOption("timezone"));
            ngModelCtrl.$setViewValue(dt);
            ngModelCtrl.$render();
          } else {
            self.activeDate = date;
            setMode(self.modes[self.modes.indexOf($scope.datepickerMode) - 1]);
  
            $scope.$emit("uib:datepicker.mode");
          }
  
          $scope.$broadcast("uib:datepicker.focus");
        };
  
        $scope.move = function (direction) {
          var year = self.activeDate.getFullYear() + direction * (self.step.years || 0),
            month = self.activeDate.getMonth() + direction * (self.step.months || 0);
          self.activeDate.setFullYear(year, month, 1);
          self.refreshView();
        };
  
        $scope.toggleMode = function (direction) {
          direction = direction || 1;
  
          if (
            ($scope.datepickerMode === self.maxMode && direction === 1) ||
            ($scope.datepickerMode === self.minMode && direction === -1)
          ) {
            return;
          }
  
          setMode(self.modes[self.modes.indexOf($scope.datepickerMode) + direction]);
  
          $scope.$emit("uib:datepicker.mode");
        };
  
        // Key event mapper
        $scope.keys = {
          13: "enter",
          32: "space",
          33: "pageup",
          34: "pagedown",
          35: "end",
          36: "home",
          37: "left",
          38: "up",
          39: "right",
          40: "down"
        };
  
        var focusElement = function () {
          self.element[0].focus();
        };
  
        // Listen for focus requests from popup directive
        $scope.$on("uib:datepicker.focus", focusElement);
  
        $scope.keydown = function (evt) {
          var key = $scope.keys[evt.which];
  
          if (!key || evt.shiftKey || evt.altKey || $scope.disabled) {
            return;
          }
  
          evt.preventDefault();
          if (!self.shortcutPropagation) {
            evt.stopPropagation();
          }
  
          if (key === "enter" || key === "space") {
            if (self.isDisabled(self.activeDate)) {
              return; // do nothing
            }
            $scope.select(self.activeDate);
          } else if (evt.ctrlKey && (key === "up" || key === "down")) {
            $scope.toggleMode(key === "up" ? 1 : -1);
          } else {
            self.handleKeyDown(key, evt);
            self.refreshView();
          }
        };
  
        $element.on("keydown", function (evt) {
          $scope.$apply(function () {
            $scope.keydown(evt);
          });
        });
  
        $scope.$on("$destroy", function () {
          //Clear all watch listeners on destroy
          while (watchListeners.length) {
            watchListeners.shift()();
          }
        });
  
        function setMode(mode) {
          $scope.datepickerMode = mode;
          $scope.datepickerOptions.datepickerMode = mode;
        }
  
        function extractOptions(ngModelCtrl) {
          var ngModelOptions;
  
          if (angular.version.minor < 6) {
            // in angular < 1.6 $options could be missing
            // guarantee a value
            ngModelOptions =
              ngModelCtrl.$options || $scope.datepickerOptions.ngModelOptions || datepickerConfig.ngModelOptions || {};
  
            // mimic 1.6+ api
            ngModelOptions.getOption = function (key) {
              return ngModelOptions[key];
            };
          } else {
            // in angular >=1.6 $options is always present
            // ng-model-options defaults timezone to null; don't let its precedence squash a non-null value
            var timezone =
              ngModelCtrl.$options.getOption("timezone") ||
              ($scope.datepickerOptions.ngModelOptions ? $scope.datepickerOptions.ngModelOptions.timezone : null) ||
              (datepickerConfig.ngModelOptions ? datepickerConfig.ngModelOptions.timezone : null);
  
            // values passed to createChild override existing values
            ngModelOptions = ngModelCtrl.$options // start with a ModelOptions instance
              .createChild(datepickerConfig.ngModelOptions) // lowest precedence
              .createChild($scope.datepickerOptions.ngModelOptions)
              .createChild(ngModelCtrl.$options) // highest precedence
              .createChild({ timezone: timezone }); // to keep from squashing a non-null value
          }
  
          return ngModelOptions;
        }
      }
    ])
  
    .controller("UibDaypickerController", [
      "$scope",
      "$element",
      "dateFilter",
      function (scope, $element, dateFilter) {
        var DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
        this.step = { months: 1 };
        this.element = $element;
        function getDaysInMonth(year, month) {
          return month === 1 && year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : DAYS_IN_MONTH[month];
        }
  
        this.init = function (ctrl) {
          angular.extend(ctrl, this);
          scope.showWeeks = ctrl.showWeeks;
          ctrl.refreshView();
        };
  
        this.getDates = function (startDate, n) {
          var dates = new Array(n),
            current = new Date(startDate),
            i = 0,
            date;
          while (i < n) {
            date = new Date(current);
            dates[i++] = date;
            current.setDate(current.getDate() + 1);
          }
          return dates;
        };
  
        this._refreshView = function () {
          var year = this.activeDate.getFullYear(),
            month = this.activeDate.getMonth(),
            firstDayOfMonth = new Date(this.activeDate);
  
          firstDayOfMonth.setFullYear(year, month, 1);
  
          var difference = this.startingDay - firstDayOfMonth.getDay(),
            numDisplayedFromPreviousMonth = difference > 0 ? 7 - difference : -difference,
            firstDate = new Date(firstDayOfMonth);
  
          if (numDisplayedFromPreviousMonth > 0) {
            firstDate.setDate(-numDisplayedFromPreviousMonth + 1);
          }
  
          // 42 is the number of days on a six-week calendar
          var days = this.getDates(firstDate, 42);
          for (var i = 0; i < 42; i++) {
            days[i] = angular.extend(this.createDateObject(days[i], this.formatDay), {
              secondary: days[i].getMonth() !== month,
              uid: scope.uniqueId + "-" + i
            });
          }
  
          scope.labels = new Array(7);
          for (var j = 0; j < 7; j++) {
            scope.labels[j] = {
              abbr: dateFilter(days[j].date, this.formatDayHeader),
              full: dateFilter(days[j].date, "EEEE")
            };
          }
  
          scope.title = dateFilter(this.activeDate, this.formatDayTitle);
          scope.rows = this.split(days, 7);
  
          if (scope.showWeeks) {
            scope.weekNumbers = [];
            var thursdayIndex = (4 + 7 - this.startingDay) % 7,
              numWeeks = scope.rows.length;
            for (var curWeek = 0; curWeek < numWeeks; curWeek++) {
              scope.weekNumbers.push(getISO8601WeekNumber(scope.rows[curWeek][thursdayIndex].date));
            }
          }
        };
  
        this.compare = function (date1, date2) {
          var _date1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
          var _date2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
          _date1.setFullYear(date1.getFullYear());
          _date2.setFullYear(date2.getFullYear());
          return _date1 - _date2;
        };
  
        function getISO8601WeekNumber(date) {
          var checkDate = new Date(date);
          checkDate.setDate(checkDate.getDate() + 4 - (checkDate.getDay() || 7)); // Thursday
          var time = checkDate.getTime();
          checkDate.setMonth(0); // Compare with Jan 1
          checkDate.setDate(1);
          return Math.floor(Math.round((time - checkDate) / 86400000) / 7) + 1;
        }
  
        this.handleKeyDown = function (key, evt) {
          var date = this.activeDate.getDate();
  
          if (key === "left") {
            date = date - 1;
          } else if (key === "up") {
            date = date - 7;
          } else if (key === "right") {
            date = date + 1;
          } else if (key === "down") {
            date = date + 7;
          } else if (key === "pageup" || key === "pagedown") {
            var month = this.activeDate.getMonth() + (key === "pageup" ? -1 : 1);
            this.activeDate.setMonth(month, 1);
            date = Math.min(getDaysInMonth(this.activeDate.getFullYear(), this.activeDate.getMonth()), date);
          } else if (key === "home") {
            date = 1;
          } else if (key === "end") {
            date = getDaysInMonth(this.activeDate.getFullYear(), this.activeDate.getMonth());
          }
          this.activeDate.setDate(date);
        };
      }
    ])
  
    .controller("UibMonthpickerController", [
      "$scope",
      "$element",
      "dateFilter",
      function (scope, $element, dateFilter) {
        this.step = { years: 1 };
        this.element = $element;
  
        this.init = function (ctrl) {
          angular.extend(ctrl, this);
          ctrl.refreshView();
        };
  
        this._refreshView = function () {
          var months = new Array(12),
            year = this.activeDate.getFullYear(),
            date;
  
          for (var i = 0; i < 12; i++) {
            date = new Date(this.activeDate);
            date.setFullYear(year, i, 1);
            months[i] = angular.extend(this.createDateObject(date, this.formatMonth), {
              uid: scope.uniqueId + "-" + i
            });
          }
  
          scope.title = dateFilter(this.activeDate, this.formatMonthTitle);
          scope.rows = this.split(months, this.monthColumns);
          scope.yearHeaderColspan = this.monthColumns > 3 ? this.monthColumns - 2 : 1;
        };
  
        this.compare = function (date1, date2) {
          var _date1 = new Date(date1.getFullYear(), date1.getMonth());
          var _date2 = new Date(date2.getFullYear(), date2.getMonth());
          _date1.setFullYear(date1.getFullYear());
          _date2.setFullYear(date2.getFullYear());
          return _date1 - _date2;
        };
  
        this.handleKeyDown = function (key, evt) {
          var date = this.activeDate.getMonth();
  
          if (key === "left") {
            date = date - 1;
          } else if (key === "up") {
            date = date - this.monthColumns;
          } else if (key === "right") {
            date = date + 1;
          } else if (key === "down") {
            date = date + this.monthColumns;
          } else if (key === "pageup" || key === "pagedown") {
            var year = this.activeDate.getFullYear() + (key === "pageup" ? -1 : 1);
            this.activeDate.setFullYear(year);
          } else if (key === "home") {
            date = 0;
          } else if (key === "end") {
            date = 11;
          }
          this.activeDate.setMonth(date);
        };
      }
    ])
  
    .controller("UibYearpickerController", [
      "$scope",
      "$element",
      "dateFilter",
      function (scope, $element, dateFilter) {
        var columns, range;
        this.element = $element;
  
        function getStartingYear(year) {
          return parseInt((year - 1) / range, 10) * range + 1;
        }
  
        this.yearpickerInit = function () {
          columns = this.yearColumns;
          range = this.yearRows * columns;
          this.step = { years: range };
        };
  
        this._refreshView = function () {
          var years = new Array(range),
            date;
  
          for (var i = 0, start = getStartingYear(this.activeDate.getFullYear()); i < range; i++) {
            date = new Date(this.activeDate);
            date.setFullYear(start + i, 0, 1);
            years[i] = angular.extend(this.createDateObject(date, this.formatYear), {
              uid: scope.uniqueId + "-" + i
            });
          }
  
          scope.title = [years[0].label, years[range - 1].label].join(" - ");
          scope.rows = this.split(years, columns);
          scope.columns = columns;
        };
  
        this.compare = function (date1, date2) {
          return date1.getFullYear() - date2.getFullYear();
        };
  
        this.handleKeyDown = function (key, evt) {
          var date = this.activeDate.getFullYear();
  
          if (key === "left") {
            date = date - 1;
          } else if (key === "up") {
            date = date - columns;
          } else if (key === "right") {
            date = date + 1;
          } else if (key === "down") {
            date = date + columns;
          } else if (key === "pageup" || key === "pagedown") {
            date += (key === "pageup" ? -1 : 1) * range;
          } else if (key === "home") {
            date = getStartingYear(this.activeDate.getFullYear());
          } else if (key === "end") {
            date = getStartingYear(this.activeDate.getFullYear()) + range - 1;
          }
          this.activeDate.setFullYear(date);
        };
      }
    ])
  
    .directive("uibDatepicker", function () {
      return {
        templateUrl: function (element, attrs) {
          return attrs.templateUrl || "uib/template/datepicker/datepicker.html";
        },
        scope: {
          datepickerOptions: "=?"
        },
        require: ["uibDatepicker", "^ngModel"],
        restrict: "A",
        controller: "UibDatepickerController",
        controllerAs: "datepicker",
        link: function (scope, element, attrs, ctrls) {
          var datepickerCtrl = ctrls[0],
            ngModelCtrl = ctrls[1];
  
          datepickerCtrl.init(ngModelCtrl);
        }
      };
    })
  
    .directive("uibDaypicker", function () {
      return {
        templateUrl: function (element, attrs) {
          return attrs.templateUrl || "uib/template/datepicker/day.html";
        },
        require: ["^uibDatepicker", "uibDaypicker"],
        restrict: "A",
        controller: "UibDaypickerController",
        link: function (scope, element, attrs, ctrls) {
          var datepickerCtrl = ctrls[0],
            daypickerCtrl = ctrls[1];
  
          daypickerCtrl.init(datepickerCtrl);
        }
      };
    })
  
    .directive("uibMonthpicker", function () {
      return {
        templateUrl: function (element, attrs) {
          return attrs.templateUrl || "uib/template/datepicker/month.html";
        },
        require: ["^uibDatepicker", "uibMonthpicker"],
        restrict: "A",
        controller: "UibMonthpickerController",
        link: function (scope, element, attrs, ctrls) {
          var datepickerCtrl = ctrls[0],
            monthpickerCtrl = ctrls[1];
  
          monthpickerCtrl.init(datepickerCtrl);
        }
      };
    })
  
    .directive("uibYearpicker", function () {
      return {
        templateUrl: function (element, attrs) {
          return attrs.templateUrl || "uib/template/datepicker/year.html";
        },
        require: ["^uibDatepicker", "uibYearpicker"],
        restrict: "A",
        controller: "UibYearpickerController",
        link: function (scope, element, attrs, ctrls) {
          var ctrl = ctrls[0];
          angular.extend(ctrl, ctrls[1]);
          ctrl.yearpickerInit();
  
          ctrl.refreshView();
        }
      };
    });
  
  angular
    .module("ui.bootstrap.position", [])
  
    /**
     * A set of utility methods for working with the DOM.
     * It is meant to be used where we need to absolute-position elements in
     * relation to another element (this is the case for tooltips, popovers,
     * typeahead suggestions etc.).
     */
    .factory("$uibPosition", [
      "$document",
      "$window",
      function ($document, $window) {
        /**
         * Used by scrollbarWidth() function to cache scrollbar's width.
         * Do not access this variable directly, use scrollbarWidth() instead.
         */
        var SCROLLBAR_WIDTH;
        /**
         * scrollbar on body and html element in IE and Edge overlay
         * content and should be considered 0 width.
         */
        var BODY_SCROLLBAR_WIDTH;
        var OVERFLOW_REGEX = {
          normal: /(auto|scroll)/,
          hidden: /(auto|scroll|hidden)/
        };
        var PLACEMENT_REGEX = {
          auto: /\s?auto?\s?/i,
          primary: /^(top|bottom|left|right)$/,
          secondary: /^(top|bottom|left|right|center)$/,
          vertical: /^(top|bottom)$/
        };
        var BODY_REGEX = /(HTML|BODY)/;
  
        return {
          /**
           * Provides a raw DOM element from a jQuery/jQLite element.
           *
           * @param {element} elem - The element to convert.
           *
           * @returns {element} A HTML element.
           */
          getRawNode: function (elem) {
            return elem.nodeName ? elem : elem[0] || elem;
          },
  
          /**
           * Provides a parsed number for a style property.  Strips
           * units and casts invalid numbers to 0.
           *
           * @param {string} value - The style value to parse.
           *
           * @returns {number} A valid number.
           */
          parseStyle: function (value) {
            value = parseFloat(value);
            return isFinite(value) ? value : 0;
          },
  
          /**
           * Provides the closest positioned ancestor.
           *
           * @param {element} element - The element to get the offest parent for.
           *
           * @returns {element} The closest positioned ancestor.
           */
          offsetParent: function (elem) {
            elem = this.getRawNode(elem);
  
            var offsetParent = elem.offsetParent || $document[0].documentElement;
  
            function isStaticPositioned(el) {
              return ($window.getComputedStyle(el).position || "static") === "static";
            }
  
            while (offsetParent && offsetParent !== $document[0].documentElement && isStaticPositioned(offsetParent)) {
              offsetParent = offsetParent.offsetParent;
            }
  
            return offsetParent || $document[0].documentElement;
          },
  
          /**
           * Provides the scrollbar width, concept from TWBS measureScrollbar()
           * function in https://github.com/twbs/bootstrap/blob/master/js/modal.js
           * In IE and Edge, scollbar on body and html element overlay and should
           * return a width of 0.
           *
           * @returns {number} The width of the browser scollbar.
           */
          scrollbarWidth: function (isBody) {
            if (isBody) {
              if (angular.isUndefined(BODY_SCROLLBAR_WIDTH)) {
                var bodyElem = $document.find("body");
                bodyElem.addClass("uib-position-body-scrollbar-measure");
                BODY_SCROLLBAR_WIDTH = $window.innerWidth - bodyElem[0].clientWidth;
                BODY_SCROLLBAR_WIDTH = isFinite(BODY_SCROLLBAR_WIDTH) ? BODY_SCROLLBAR_WIDTH : 0;
                bodyElem.removeClass("uib-position-body-scrollbar-measure");
              }
              return BODY_SCROLLBAR_WIDTH;
            }
  
            if (angular.isUndefined(SCROLLBAR_WIDTH)) {
              var scrollElem = angular.element('<div class="uib-position-scrollbar-measure"></div>');
              $document.find("body").append(scrollElem);
              SCROLLBAR_WIDTH = scrollElem[0].offsetWidth - scrollElem[0].clientWidth;
              SCROLLBAR_WIDTH = isFinite(SCROLLBAR_WIDTH) ? SCROLLBAR_WIDTH : 0;
              scrollElem.remove();
            }
  
            return SCROLLBAR_WIDTH;
          },
  
          /**
           * Provides the padding required on an element to replace the scrollbar.
           *
           * @returns {object} An object with the following properties:
           *   <ul>
           *     <li>**scrollbarWidth**: the width of the scrollbar</li>
           *     <li>**widthOverflow**: whether the the width is overflowing</li>
           *     <li>**right**: the amount of right padding on the element needed to replace the scrollbar</li>
           *     <li>**rightOriginal**: the amount of right padding currently on the element</li>
           *     <li>**heightOverflow**: whether the the height is overflowing</li>
           *     <li>**bottom**: the amount of bottom padding on the element needed to replace the scrollbar</li>
           *     <li>**bottomOriginal**: the amount of bottom padding currently on the element</li>
           *   </ul>
           */
          scrollbarPadding: function (elem) {
            elem = this.getRawNode(elem);
  
            var elemStyle = $window.getComputedStyle(elem);
            var paddingRight = this.parseStyle(elemStyle.paddingRight);
            var paddingBottom = this.parseStyle(elemStyle.paddingBottom);
            var scrollParent = this.scrollParent(elem, false, true);
            var scrollbarWidth = this.scrollbarWidth(BODY_REGEX.test(scrollParent.tagName));
  
            return {
              scrollbarWidth: scrollbarWidth,
              widthOverflow: scrollParent.scrollWidth > scrollParent.clientWidth,
              right: paddingRight + scrollbarWidth,
              originalRight: paddingRight,
              heightOverflow: scrollParent.scrollHeight > scrollParent.clientHeight,
              bottom: paddingBottom + scrollbarWidth,
              originalBottom: paddingBottom
            };
          },
  
          /**
           * Checks to see if the element is scrollable.
           *
           * @param {element} elem - The element to check.
           * @param {boolean=} [includeHidden=false] - Should scroll style of 'hidden' be considered,
           *   default is false.
           *
           * @returns {boolean} Whether the element is scrollable.
           */
          isScrollable: function (elem, includeHidden) {
            elem = this.getRawNode(elem);
  
            var overflowRegex = includeHidden ? OVERFLOW_REGEX.hidden : OVERFLOW_REGEX.normal;
            var elemStyle = $window.getComputedStyle(elem);
            return overflowRegex.test(elemStyle.overflow + elemStyle.overflowY + elemStyle.overflowX);
          },
  
          /**
           * Provides the closest scrollable ancestor.
           * A port of the jQuery UI scrollParent method:
           * https://github.com/jquery/jquery-ui/blob/master/ui/scroll-parent.js
           *
           * @param {element} elem - The element to find the scroll parent of.
           * @param {boolean=} [includeHidden=false] - Should scroll style of 'hidden' be considered,
           *   default is false.
           * @param {boolean=} [includeSelf=false] - Should the element being passed be
           * included in the scrollable llokup.
           *
           * @returns {element} A HTML element.
           */
          scrollParent: function (elem, includeHidden, includeSelf) {
            elem = this.getRawNode(elem);
  
            var overflowRegex = includeHidden ? OVERFLOW_REGEX.hidden : OVERFLOW_REGEX.normal;
            var documentEl = $document[0].documentElement;
            var elemStyle = $window.getComputedStyle(elem);
            if (includeSelf && overflowRegex.test(elemStyle.overflow + elemStyle.overflowY + elemStyle.overflowX)) {
              return elem;
            }
            var excludeStatic = elemStyle.position === "absolute";
            var scrollParent = elem.parentElement || documentEl;
  
            if (scrollParent === documentEl || elemStyle.position === "fixed") {
              return documentEl;
            }
  
            while (scrollParent.parentElement && scrollParent !== documentEl) {
              var spStyle = $window.getComputedStyle(scrollParent);
              if (excludeStatic && spStyle.position !== "static") {
                excludeStatic = false;
              }
  
              if (!excludeStatic && overflowRegex.test(spStyle.overflow + spStyle.overflowY + spStyle.overflowX)) {
                break;
              }
              scrollParent = scrollParent.parentElement;
            }
  
            return scrollParent;
          },
  
          /**
           * Provides read-only equivalent of jQuery's position function:
           * http://api.jquery.com/position/ - distance to closest positioned
           * ancestor.  Does not account for margins by default like jQuery position.
           *
           * @param {element} elem - The element to caclulate the position on.
           * @param {boolean=} [includeMargins=false] - Should margins be accounted
           * for, default is false.
           *
           * @returns {object} An object with the following properties:
           *   <ul>
           *     <li>**width**: the width of the element</li>
           *     <li>**height**: the height of the element</li>
           *     <li>**top**: distance to top edge of offset parent</li>
           *     <li>**left**: distance to left edge of offset parent</li>
           *   </ul>
           */
          position: function (elem, includeMagins) {
            elem = this.getRawNode(elem);
  
            var elemOffset = this.offset(elem);
            if (includeMagins) {
              var elemStyle = $window.getComputedStyle(elem);
              elemOffset.top -= this.parseStyle(elemStyle.marginTop);
              elemOffset.left -= this.parseStyle(elemStyle.marginLeft);
            }
            var parent = this.offsetParent(elem);
            var parentOffset = { top: 0, left: 0 };
  
            if (parent !== $document[0].documentElement) {
              parentOffset = this.offset(parent);
              parentOffset.top += parent.clientTop - parent.scrollTop;
              parentOffset.left += parent.clientLeft - parent.scrollLeft;
            }
  
            return {
              width: Math.round(angular.isNumber(elemOffset.width) ? elemOffset.width : elem.offsetWidth),
              height: Math.round(angular.isNumber(elemOffset.height) ? elemOffset.height : elem.offsetHeight),
              top: Math.round(elemOffset.top - parentOffset.top),
              left: Math.round(elemOffset.left - parentOffset.left)
            };
          },
  
          /**
           * Provides read-only equivalent of jQuery's offset function:
           * http://api.jquery.com/offset/ - distance to viewport.  Does
           * not account for borders, margins, or padding on the body
           * element.
           *
           * @param {element} elem - The element to calculate the offset on.
           *
           * @returns {object} An object with the following properties:
           *   <ul>
           *     <li>**width**: the width of the element</li>
           *     <li>**height**: the height of the element</li>
           *     <li>**top**: distance to top edge of viewport</li>
           *     <li>**right**: distance to bottom edge of viewport</li>
           *   </ul>
           */
          offset: function (elem) {
            elem = this.getRawNode(elem);
  
            var elemBCR = elem.getBoundingClientRect();
            return {
              width: Math.round(angular.isNumber(elemBCR.width) ? elemBCR.width : elem.offsetWidth),
              height: Math.round(angular.isNumber(elemBCR.height) ? elemBCR.height : elem.offsetHeight),
              top: Math.round(elemBCR.top + ($window.pageYOffset || $document[0].documentElement.scrollTop)),
              left: Math.round(elemBCR.left + ($window.pageXOffset || $document[0].documentElement.scrollLeft))
            };
          },
  
          /**
           * Provides offset distance to the closest scrollable ancestor
           * or viewport.  Accounts for border and scrollbar width.
           *
           * Right and bottom dimensions represent the distance to the
           * respective edge of the viewport element.  If the element
           * edge extends beyond the viewport, a negative value will be
           * reported.
           *
           * @param {element} elem - The element to get the viewport offset for.
           * @param {boolean=} [useDocument=false] - Should the viewport be the document element instead
           * of the first scrollable element, default is false.
           * @param {boolean=} [includePadding=true] - Should the padding on the offset parent element
           * be accounted for, default is true.
           *
           * @returns {object} An object with the following properties:
           *   <ul>
           *     <li>**top**: distance to the top content edge of viewport element</li>
           *     <li>**bottom**: distance to the bottom content edge of viewport element</li>
           *     <li>**left**: distance to the left content edge of viewport element</li>
           *     <li>**right**: distance to the right content edge of viewport element</li>
           *   </ul>
           */
          viewportOffset: function (elem, useDocument, includePadding) {
            elem = this.getRawNode(elem);
            includePadding = includePadding !== false ? true : false;
  
            var elemBCR = elem.getBoundingClientRect();
            var offsetBCR = { top: 0, left: 0, bottom: 0, right: 0 };
  
            var offsetParent = useDocument ? $document[0].documentElement : this.scrollParent(elem);
            var offsetParentBCR = offsetParent.getBoundingClientRect();
  
            offsetBCR.top = offsetParentBCR.top + offsetParent.clientTop;
            offsetBCR.left = offsetParentBCR.left + offsetParent.clientLeft;
            if (offsetParent === $document[0].documentElement) {
              offsetBCR.top += $window.pageYOffset;
              offsetBCR.left += $window.pageXOffset;
            }
            offsetBCR.bottom = offsetBCR.top + offsetParent.clientHeight;
            offsetBCR.right = offsetBCR.left + offsetParent.clientWidth;
  
            if (includePadding) {
              var offsetParentStyle = $window.getComputedStyle(offsetParent);
              offsetBCR.top += this.parseStyle(offsetParentStyle.paddingTop);
              offsetBCR.bottom -= this.parseStyle(offsetParentStyle.paddingBottom);
              offsetBCR.left += this.parseStyle(offsetParentStyle.paddingLeft);
              offsetBCR.right -= this.parseStyle(offsetParentStyle.paddingRight);
            }
  
            return {
              top: Math.round(elemBCR.top - offsetBCR.top),
              bottom: Math.round(offsetBCR.bottom - elemBCR.bottom),
              left: Math.round(elemBCR.left - offsetBCR.left),
              right: Math.round(offsetBCR.right - elemBCR.right)
            };
          },
  
          /**
           * Provides an array of placement values parsed from a placement string.
           * Along with the 'auto' indicator, supported placement strings are:
           *   <ul>
           *     <li>top: element on top, horizontally centered on host element.</li>
           *     <li>top-left: element on top, left edge aligned with host element left edge.</li>
           *     <li>top-right: element on top, lerightft edge aligned with host element right edge.</li>
           *     <li>bottom: element on bottom, horizontally centered on host element.</li>
           *     <li>bottom-left: element on bottom, left edge aligned with host element left edge.</li>
           *     <li>bottom-right: element on bottom, right edge aligned with host element right edge.</li>
           *     <li>left: element on left, vertically centered on host element.</li>
           *     <li>left-top: element on left, top edge aligned with host element top edge.</li>
           *     <li>left-bottom: element on left, bottom edge aligned with host element bottom edge.</li>
           *     <li>right: element on right, vertically centered on host element.</li>
           *     <li>right-top: element on right, top edge aligned with host element top edge.</li>
           *     <li>right-bottom: element on right, bottom edge aligned with host element bottom edge.</li>
           *   </ul>
           * A placement string with an 'auto' indicator is expected to be
           * space separated from the placement, i.e: 'auto bottom-left'  If
           * the primary and secondary placement values do not match 'top,
           * bottom, left, right' then 'top' will be the primary placement and
           * 'center' will be the secondary placement.  If 'auto' is passed, true
           * will be returned as the 3rd value of the array.
           *
           * @param {string} placement - The placement string to parse.
           *
           * @returns {array} An array with the following values
           * <ul>
           *   <li>**[0]**: The primary placement.</li>
           *   <li>**[1]**: The secondary placement.</li>
           *   <li>**[2]**: If auto is passed: true, else undefined.</li>
           * </ul>
           */
          parsePlacement: function (placement) {
            var autoPlace = PLACEMENT_REGEX.auto.test(placement);
            if (autoPlace) {
              placement = placement.replace(PLACEMENT_REGEX.auto, "");
            }
  
            placement = placement.split("-");
  
            placement[0] = placement[0] || "top";
            if (!PLACEMENT_REGEX.primary.test(placement[0])) {
              placement[0] = "top";
            }
  
            placement[1] = placement[1] || "center";
            if (!PLACEMENT_REGEX.secondary.test(placement[1])) {
              placement[1] = "center";
            }
  
            if (autoPlace) {
              placement[2] = true;
            } else {
              placement[2] = false;
            }
  
            return placement;
          },
  
          /**
           * Provides coordinates for an element to be positioned relative to
           * another element.  Passing 'auto' as part of the placement parameter
           * will enable smart placement - where the element fits. i.e:
           * 'auto left-top' will check to see if there is enough space to the left
           * of the hostElem to fit the targetElem, if not place right (same for secondary
           * top placement).  Available space is calculated using the viewportOffset
           * function.
           *
           * @param {element} hostElem - The element to position against.
           * @param {element} targetElem - The element to position.
           * @param {string=} [placement=top] - The placement for the targetElem,
           *   default is 'top'. 'center' is assumed as secondary placement for
           *   'top', 'left', 'right', and 'bottom' placements.  Available placements are:
           *   <ul>
           *     <li>top</li>
           *     <li>top-right</li>
           *     <li>top-left</li>
           *     <li>bottom</li>
           *     <li>bottom-left</li>
           *     <li>bottom-right</li>
           *     <li>left</li>
           *     <li>left-top</li>
           *     <li>left-bottom</li>
           *     <li>right</li>
           *     <li>right-top</li>
           *     <li>right-bottom</li>
           *   </ul>
           * @param {boolean=} [appendToBody=false] - Should the top and left values returned
           *   be calculated from the body element, default is false.
           *
           * @returns {object} An object with the following properties:
           *   <ul>
           *     <li>**top**: Value for targetElem top.</li>
           *     <li>**left**: Value for targetElem left.</li>
           *     <li>**placement**: The resolved placement.</li>
           *   </ul>
           */
          positionElements: function (hostElem, targetElem, placement, appendToBody) {
            hostElem = this.getRawNode(hostElem);
            targetElem = this.getRawNode(targetElem);
  
            // need to read from prop to support tests.
            var targetWidth = angular.isDefined(targetElem.offsetWidth)
              ? targetElem.offsetWidth
              : targetElem.prop("offsetWidth");
            var targetHeight = angular.isDefined(targetElem.offsetHeight)
              ? targetElem.offsetHeight
              : targetElem.prop("offsetHeight");
  
            placement = this.parsePlacement(placement);
  
            var hostElemPos = appendToBody ? this.offset(hostElem) : this.position(hostElem);
            var targetElemPos = { top: 0, left: 0, placement: "" };
  
            if (placement[2]) {
              var viewportOffset = this.viewportOffset(hostElem, appendToBody);
  
              var targetElemStyle = $window.getComputedStyle(targetElem);
              var adjustedSize = {
                width:
                  targetWidth +
                  Math.round(
                    Math.abs(this.parseStyle(targetElemStyle.marginLeft) + this.parseStyle(targetElemStyle.marginRight))
                  ),
                height:
                  targetHeight +
                  Math.round(
                    Math.abs(this.parseStyle(targetElemStyle.marginTop) + this.parseStyle(targetElemStyle.marginBottom))
                  )
              };
  
              placement[0] =
                placement[0] === "top" &&
                adjustedSize.height > viewportOffset.top &&
                adjustedSize.height <= viewportOffset.bottom
                  ? "bottom"
                  : placement[0] === "bottom" &&
                    adjustedSize.height > viewportOffset.bottom &&
                    adjustedSize.height <= viewportOffset.top
                  ? "top"
                  : placement[0] === "left" &&
                    adjustedSize.width > viewportOffset.left &&
                    adjustedSize.width <= viewportOffset.right
                  ? "right"
                  : placement[0] === "right" &&
                    adjustedSize.width > viewportOffset.right &&
                    adjustedSize.width <= viewportOffset.left
                  ? "left"
                  : placement[0];
  
              placement[1] =
                placement[1] === "top" &&
                adjustedSize.height - hostElemPos.height > viewportOffset.bottom &&
                adjustedSize.height - hostElemPos.height <= viewportOffset.top
                  ? "bottom"
                  : placement[1] === "bottom" &&
                    adjustedSize.height - hostElemPos.height > viewportOffset.top &&
                    adjustedSize.height - hostElemPos.height <= viewportOffset.bottom
                  ? "top"
                  : placement[1] === "left" &&
                    adjustedSize.width - hostElemPos.width > viewportOffset.right &&
                    adjustedSize.width - hostElemPos.width <= viewportOffset.left
                  ? "right"
                  : placement[1] === "right" &&
                    adjustedSize.width - hostElemPos.width > viewportOffset.left &&
                    adjustedSize.width - hostElemPos.width <= viewportOffset.right
                  ? "left"
                  : placement[1];
  
              if (placement[1] === "center") {
                if (PLACEMENT_REGEX.vertical.test(placement[0])) {
                  var xOverflow = hostElemPos.width / 2 - targetWidth / 2;
                  if (
                    viewportOffset.left + xOverflow < 0 &&
                    adjustedSize.width - hostElemPos.width <= viewportOffset.right
                  ) {
                    placement[1] = "left";
                  } else if (
                    viewportOffset.right + xOverflow < 0 &&
                    adjustedSize.width - hostElemPos.width <= viewportOffset.left
                  ) {
                    placement[1] = "right";
                  }
                } else {
                  var yOverflow = hostElemPos.height / 2 - adjustedSize.height / 2;
                  if (
                    viewportOffset.top + yOverflow < 0 &&
                    adjustedSize.height - hostElemPos.height <= viewportOffset.bottom
                  ) {
                    placement[1] = "top";
                  } else if (
                    viewportOffset.bottom + yOverflow < 0 &&
                    adjustedSize.height - hostElemPos.height <= viewportOffset.top
                  ) {
                    placement[1] = "bottom";
                  }
                }
              }
            }
  
            switch (placement[0]) {
              case "top":
                targetElemPos.top = hostElemPos.top - targetHeight;
                break;
              case "bottom":
                targetElemPos.top = hostElemPos.top + hostElemPos.height;
                break;
              case "left":
                targetElemPos.left = hostElemPos.left - targetWidth;
                break;
              case "right":
                targetElemPos.left = hostElemPos.left + hostElemPos.width;
                break;
            }
  
            switch (placement[1]) {
              case "top":
                targetElemPos.top = hostElemPos.top;
                break;
              case "bottom":
                targetElemPos.top = hostElemPos.top + hostElemPos.height - targetHeight;
                break;
              case "left":
                targetElemPos.left = hostElemPos.left;
                break;
              case "right":
                targetElemPos.left = hostElemPos.left + hostElemPos.width - targetWidth;
                break;
              case "center":
                if (PLACEMENT_REGEX.vertical.test(placement[0])) {
                  targetElemPos.left = hostElemPos.left + hostElemPos.width / 2 - targetWidth / 2;
                } else {
                  targetElemPos.top = hostElemPos.top + hostElemPos.height / 2 - targetHeight / 2;
                }
                break;
            }
  
            targetElemPos.top = Math.round(targetElemPos.top);
            targetElemPos.left = Math.round(targetElemPos.left);
            targetElemPos.placement = placement[1] === "center" ? placement[0] : placement[0] + "-" + placement[1];
  
            return targetElemPos;
          },
  
          /**
           * Provides a way to adjust the top positioning after first
           * render to correctly align element to top after content
           * rendering causes resized element height
           *
           * @param {array} placementClasses - The array of strings of classes
           * element should have.
           * @param {object} containerPosition - The object with container
           * position information
           * @param {number} initialHeight - The initial height for the elem.
           * @param {number} currentHeight - The current height for the elem.
           */
          adjustTop: function (placementClasses, containerPosition, initialHeight, currentHeight) {
            if (placementClasses.indexOf("top") !== -1 && initialHeight !== currentHeight) {
              return {
                top: containerPosition.top - currentHeight + "px"
              };
            }
          },
  
          /**
           * Provides a way for positioning tooltip & dropdown
           * arrows when using placement options beyond the standard
           * left, right, top, or bottom.
           *
           * @param {element} elem - The tooltip/dropdown element.
           * @param {string} placement - The placement for the elem.
           */
          positionArrow: function (elem, placement) {
            elem = this.getRawNode(elem);
  
            var innerElem = elem.querySelector(".tooltip-inner, .popover-inner");
            if (!innerElem) {
              return;
            }
  
            var isTooltip = angular.element(innerElem).hasClass("tooltip-inner");
  
            var arrowElem = isTooltip ? elem.querySelector(".tooltip-arrow") : elem.querySelector(".arrow");
            if (!arrowElem) {
              return;
            }
  
            var arrowCss = {
              top: "",
              bottom: "",
              left: "",
              right: ""
            };
  
            placement = this.parsePlacement(placement);
            if (placement[1] === "center") {
              // no adjustment necessary - just reset styles
              angular.element(arrowElem).css(arrowCss);
              return;
            }
  
            var borderProp = "border-" + placement[0] + "-width";
            var borderWidth = $window.getComputedStyle(arrowElem)[borderProp];
  
            var borderRadiusProp = "border-";
            if (PLACEMENT_REGEX.vertical.test(placement[0])) {
              borderRadiusProp += placement[0] + "-" + placement[1];
            } else {
              borderRadiusProp += placement[1] + "-" + placement[0];
            }
            borderRadiusProp += "-radius";
            var borderRadius = $window.getComputedStyle(isTooltip ? innerElem : elem)[borderRadiusProp];
  
            switch (placement[0]) {
              case "top":
                arrowCss.bottom = isTooltip ? "0" : "-" + borderWidth;
                break;
              case "bottom":
                arrowCss.top = isTooltip ? "0" : "-" + borderWidth;
                break;
              case "left":
                arrowCss.right = isTooltip ? "0" : "-" + borderWidth;
                break;
              case "right":
                arrowCss.left = isTooltip ? "0" : "-" + borderWidth;
                break;
            }
  
            arrowCss[placement[1]] = borderRadius;
  
            angular.element(arrowElem).css(arrowCss);
          }
        };
      }
    ]);
  
  angular
    .module("ui.bootstrap.datepickerPopup", ["ui.bootstrap.datepicker", "ui.bootstrap.position"])
  
    .value("$datepickerPopupLiteralWarning", true)
  
    .constant("uibDatepickerPopupConfig", {
      altInputFormats: [],
      appendToBody: false,
      clearText: "Clear",
      closeOnDateSelection: true,
      closeText: "Done",
      currentText: "Today",
      datepickerPopup: "yyyy-MM-dd",
      datepickerPopupTemplateUrl: "uib/template/datepickerPopup/popup.html",
      datepickerTemplateUrl: "uib/template/datepicker/datepicker.html",
      html5Types: {
        date: "yyyy-MM-dd",
        "datetime-local": "yyyy-MM-ddTHH:mm:ss.sss",
        month: "yyyy-MM"
      },
      onOpenFocus: true,
      showButtonBar: true,
      placement: "auto bottom-left"
    })
  
    .controller("UibDatepickerPopupController", [
      "$scope",
      "$element",
      "$attrs",
      "$compile",
      "$log",
      "$parse",
      "$window",
      "$document",
      "$rootScope",
      "$uibPosition",
      "dateFilter",
      "uibDateParser",
      "uibDatepickerPopupConfig",
      "$timeout",
      "uibDatepickerConfig",
      "$datepickerPopupLiteralWarning",
      function (
        $scope,
        $element,
        $attrs,
        $compile,
        $log,
        $parse,
        $window,
        $document,
        $rootScope,
        $position,
        dateFilter,
        dateParser,
        datepickerPopupConfig,
        $timeout,
        datepickerConfig,
        $datepickerPopupLiteralWarning
      ) {
        var cache = {},
          isHtml5DateInput = false;
        var dateFormat,
          closeOnDateSelection,
          appendToBody,
          onOpenFocus,
          datepickerPopupTemplateUrl,
          datepickerTemplateUrl,
          popupEl,
          datepickerEl,
          scrollParentEl,
          ngModel,
          ngModelOptions,
          $popup,
          altInputFormats,
          watchListeners = [];
  
        this.init = function (_ngModel_) {
          ngModel = _ngModel_;
          ngModelOptions = extractOptions(ngModel);
          closeOnDateSelection = angular.isDefined($attrs.closeOnDateSelection)
            ? $scope.$parent.$eval($attrs.closeOnDateSelection)
            : datepickerPopupConfig.closeOnDateSelection;
          appendToBody = angular.isDefined($attrs.datepickerAppendToBody)
            ? $scope.$parent.$eval($attrs.datepickerAppendToBody)
            : datepickerPopupConfig.appendToBody;
          onOpenFocus = angular.isDefined($attrs.onOpenFocus)
            ? $scope.$parent.$eval($attrs.onOpenFocus)
            : datepickerPopupConfig.onOpenFocus;
          datepickerPopupTemplateUrl = angular.isDefined($attrs.datepickerPopupTemplateUrl)
            ? $attrs.datepickerPopupTemplateUrl
            : datepickerPopupConfig.datepickerPopupTemplateUrl;
          datepickerTemplateUrl = angular.isDefined($attrs.datepickerTemplateUrl)
            ? $attrs.datepickerTemplateUrl
            : datepickerPopupConfig.datepickerTemplateUrl;
          altInputFormats = angular.isDefined($attrs.altInputFormats)
            ? $scope.$parent.$eval($attrs.altInputFormats)
            : datepickerPopupConfig.altInputFormats;
  
          $scope.showButtonBar = angular.isDefined($attrs.showButtonBar)
            ? $scope.$parent.$eval($attrs.showButtonBar)
            : datepickerPopupConfig.showButtonBar;
  
          if (datepickerPopupConfig.html5Types[$attrs.type]) {
            dateFormat = datepickerPopupConfig.html5Types[$attrs.type];
            isHtml5DateInput = true;
          } else {
            dateFormat = $attrs.uibDatepickerPopup || datepickerPopupConfig.datepickerPopup;
            $attrs.$observe("uibDatepickerPopup", function (value, oldValue) {
              var newDateFormat = value || datepickerPopupConfig.datepickerPopup;
              // Invalidate the $modelValue to ensure that formatters re-run
              // FIXME: Refactor when PR is merged: https://github.com/angular/angular.js/pull/10764
              if (newDateFormat !== dateFormat) {
                dateFormat = newDateFormat;
                ngModel.$modelValue = null;
  
                if (!dateFormat) {
                  throw new Error("uibDatepickerPopup must have a date format specified.");
                }
              }
            });
          }
  
          if (!dateFormat) {
            throw new Error("uibDatepickerPopup must have a date format specified.");
          }
  
          if (isHtml5DateInput && $attrs.uibDatepickerPopup) {
            throw new Error("HTML5 date input types do not support custom formats.");
          }
  
          // popup element used to display calendar
          popupEl = angular.element("<div uib-datepicker-popup-wrap><div uib-datepicker></div></div>");
  
          popupEl.attr({
            "ng-model": "date",
            "ng-change": "dateSelection(date)",
            "template-url": datepickerPopupTemplateUrl
          });
  
          // datepicker element
          datepickerEl = angular.element(popupEl.children()[0]);
          datepickerEl.attr("template-url", datepickerTemplateUrl);
  
          if (!$scope.datepickerOptions) {
            $scope.datepickerOptions = {};
          }
  
          if (isHtml5DateInput) {
            if ($attrs.type === "month") {
              $scope.datepickerOptions.datepickerMode = "month";
              $scope.datepickerOptions.minMode = "month";
            }
          }
  
          datepickerEl.attr("datepicker-options", "datepickerOptions");
  
          if (!isHtml5DateInput) {
            // Internal API to maintain the correct ng-invalid-[key] class
            ngModel.$$parserName = "date";
            ngModel.$validators.date = validator;
            ngModel.$parsers.unshift(parseDate);
            ngModel.$formatters.push(function (value) {
              if (ngModel.$isEmpty(value)) {
                $scope.date = value;
                return value;
              }
  
              if (angular.isNumber(value)) {
                value = new Date(value);
              }
  
              $scope.date = dateParser.fromTimezone(value, ngModelOptions.getOption("timezone"));
  
              return dateParser.filter($scope.date, dateFormat);
            });
          } else {
            ngModel.$formatters.push(function (value) {
              $scope.date = dateParser.fromTimezone(value, ngModelOptions.getOption("timezone"));
              return value;
            });
          }
  
          // Detect changes in the view from the text box
          ngModel.$viewChangeListeners.push(function () {
            $scope.date = parseDateString(ngModel.$viewValue);
          });
  
          $element.on("keydown", inputKeydownBind);
  
          $popup = $compile(popupEl)($scope);
          // Prevent jQuery cache memory leak (template is now redundant after linking)
          popupEl.remove();
  
          if (appendToBody) {
            $document.find("body").append($popup);
          } else {
            $element.after($popup);
          }
  
          $scope.$on("$destroy", function () {
            if ($scope.isOpen === true) {
              if (!$rootScope.$$phase) {
                $scope.$apply(function () {
                  $scope.isOpen = false;
                });
              }
            }
  
            $popup.remove();
            $element.off("keydown", inputKeydownBind);
            $document.off("click", documentClickBind);
            if (scrollParentEl) {
              scrollParentEl.off("scroll", positionPopup);
            }
            angular.element($window).off("resize", positionPopup);
  
            //Clear all watch listeners on destroy
            while (watchListeners.length) {
              watchListeners.shift()();
            }
          });
        };
  
        $scope.getText = function (key) {
          return $scope[key + "Text"] || datepickerPopupConfig[key + "Text"];
        };
  
        $scope.isDisabled = function (date) {
          if (date === "today") {
            date = dateParser.fromTimezone(new Date(), ngModelOptions.getOption("timezone"));
          }
  
          var dates = {};
          angular.forEach(["minDate", "maxDate"], function (key) {
            if (!$scope.datepickerOptions[key]) {
              dates[key] = null;
            } else if (angular.isDate($scope.datepickerOptions[key])) {
              dates[key] = new Date($scope.datepickerOptions[key]);
            } else {
              if ($datepickerPopupLiteralWarning) {
                $log.warn("Literal date support has been deprecated, please switch to date object usage");
              }
  
              dates[key] = new Date(dateFilter($scope.datepickerOptions[key], "medium"));
            }
          });
  
          return (
            ($scope.datepickerOptions && dates.minDate && $scope.compare(date, dates.minDate) < 0) ||
            (dates.maxDate && $scope.compare(date, dates.maxDate) > 0)
          );
        };
  
        $scope.compare = function (date1, date2) {
          return (
            new Date(date1.getFullYear(), date1.getMonth(), date1.getDate()) -
            new Date(date2.getFullYear(), date2.getMonth(), date2.getDate())
          );
        };
  
        // Inner change
        $scope.dateSelection = function (dt) {
          $scope.date = dt;
          var date = $scope.date ? dateParser.filter($scope.date, dateFormat) : null; // Setting to NULL is necessary for form validators to function
          $element.val(date);
          ngModel.$setViewValue(date);
  
          if (closeOnDateSelection) {
            $scope.isOpen = false;
            $element[0].focus();
          }
        };
  
        $scope.keydown = function (evt) {
          if (evt.which === 27) {
            evt.stopPropagation();
            $scope.isOpen = false;
            $element[0].focus();
          }
        };
  
        $scope.select = function (date, evt) {
          evt.stopPropagation();
  
          if (date === "today") {
            var today = new Date();
            if (angular.isDate($scope.date)) {
              date = new Date($scope.date);
              date.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());
            } else {
              date = dateParser.fromTimezone(today, ngModelOptions.getOption("timezone"));
              date.setHours(0, 0, 0, 0);
            }
          }
          $scope.dateSelection(date);
        };
  
        $scope.close = function (evt) {
          evt.stopPropagation();
  
          $scope.isOpen = false;
          $element[0].focus();
        };
  
        $scope.disabled = angular.isDefined($attrs.disabled) || false;
        if ($attrs.ngDisabled) {
          watchListeners.push(
            $scope.$parent.$watch($parse($attrs.ngDisabled), function (disabled) {
              $scope.disabled = disabled;
            })
          );
        }
  
        $scope.$watch("isOpen", function (value) {
          if (value) {
            if (!$scope.disabled) {
              $timeout(
                function () {
                  positionPopup();
  
                  if (onOpenFocus) {
                    $scope.$broadcast("uib:datepicker.focus");
                  }
  
                  $document.on("click", documentClickBind);
  
                  var placement = $attrs.popupPlacement ? $attrs.popupPlacement : datepickerPopupConfig.placement;
                  if (appendToBody || $position.parsePlacement(placement)[2]) {
                    scrollParentEl = scrollParentEl || angular.element($position.scrollParent($element));
                    if (scrollParentEl) {
                      scrollParentEl.on("scroll", positionPopup);
                    }
                  } else {
                    scrollParentEl = null;
                  }
  
                  angular.element($window).on("resize", positionPopup);
                },
                0,
                false
              );
            } else {
              $scope.isOpen = false;
            }
          } else {
            $document.off("click", documentClickBind);
            if (scrollParentEl) {
              scrollParentEl.off("scroll", positionPopup);
            }
            angular.element($window).off("resize", positionPopup);
          }
        });
  
        function cameltoDash(string) {
          return string.replace(/([A-Z])/g, function ($1) {
            return "-" + $1.toLowerCase();
          });
        }
  
        function parseDateString(viewValue) {
          var date = dateParser.parse(viewValue, dateFormat, $scope.date);
          if (isNaN(date)) {
            for (var i = 0; i < altInputFormats.length; i++) {
              date = dateParser.parse(viewValue, altInputFormats[i], $scope.date);
              if (!isNaN(date)) {
                return date;
              }
            }
          }
          return date;
        }
  
        function parseDate(viewValue) {
          if (angular.isNumber(viewValue)) {
            // presumably timestamp to date object
            viewValue = new Date(viewValue);
          }
  
          if (!viewValue) {
            return null;
          }
  
          if (angular.isDate(viewValue) && !isNaN(viewValue)) {
            return viewValue;
          }
  
          if (angular.isString(viewValue)) {
            var date = parseDateString(viewValue);
            if (!isNaN(date)) {
              return dateParser.toTimezone(date, ngModelOptions.getOption("timezone"));
            }
          }
  
          return ngModelOptions.getOption("allowInvalid") ? viewValue : undefined;
        }
  
        function validator(modelValue, viewValue) {
          var value = modelValue || viewValue;
  
          if (!$attrs.ngRequired && !value) {
            return true;
          }
  
          if (angular.isNumber(value)) {
            value = new Date(value);
          }
  
          if (!value) {
            return true;
          }
  
          if (angular.isDate(value) && !isNaN(value)) {
            return true;
          }
  
          if (angular.isString(value)) {
            return !isNaN(parseDateString(value));
          }
  
          return false;
        }
  
        function documentClickBind(event) {
          if (!$scope.isOpen && $scope.disabled) {
            return;
          }
  
          var popup = $popup[0];
          var dpContainsTarget = $element[0].contains(event.target);
          // The popup node may not be an element node
          // In some browsers (IE) only element nodes have the 'contains' function
          var popupContainsTarget = popup.contains !== undefined && popup.contains(event.target);
          if ($scope.isOpen && !(dpContainsTarget || popupContainsTarget)) {
            $scope.$apply(function () {
              $scope.isOpen = false;
            });
          }
        }
  
        function inputKeydownBind(evt) {
          if (evt.which === 27 && $scope.isOpen) {
            evt.preventDefault();
            evt.stopPropagation();
            $scope.$apply(function () {
              $scope.isOpen = false;
            });
            $element[0].focus();
          } else if (evt.which === 40 && !$scope.isOpen) {
            evt.preventDefault();
            evt.stopPropagation();
            $scope.$apply(function () {
              $scope.isOpen = true;
            });
          }
        }
  
        function positionPopup() {
          if ($scope.isOpen) {
            var dpElement = angular.element($popup[0].querySelector(".uib-datepicker-popup"));
            var placement = $attrs.popupPlacement ? $attrs.popupPlacement : datepickerPopupConfig.placement;
            var position = $position.positionElements($element, dpElement, placement, appendToBody);
            dpElement.css({ top: position.top + "px", left: position.left + "px" });
            if (dpElement.hasClass("uib-position-measure")) {
              dpElement.removeClass("uib-position-measure");
            }
          }
        }
  
        function extractOptions(ngModelCtrl) {
          var ngModelOptions;
  
          if (angular.version.minor < 6) {
            // in angular < 1.6 $options could be missing
            // guarantee a value
            ngModelOptions = angular.isObject(ngModelCtrl.$options)
              ? ngModelCtrl.$options
              : {
                  timezone: null
                };
  
            // mimic 1.6+ api
            ngModelOptions.getOption = function (key) {
              return ngModelOptions[key];
            };
          } else {
            // in angular >=1.6 $options is always present
            ngModelOptions = ngModelCtrl.$options;
          }
  
          return ngModelOptions;
        }
  
        $scope.$on("uib:datepicker.mode", function () {
          $timeout(positionPopup, 0, false);
        });
      }
    ])
  
    .directive("uibDatepickerPopup", function () {
      return {
        require: ["ngModel", "uibDatepickerPopup"],
        controller: "UibDatepickerPopupController",
        scope: {
          datepickerOptions: "=?",
          isOpen: "=?",
          currentText: "@",
          clearText: "@",
          closeText: "@"
        },
        link: function (scope, element, attrs, ctrls) {
          var ngModel = ctrls[0],
            ctrl = ctrls[1];
  
          ctrl.init(ngModel);
        }
      };
    })
  
    .directive("uibDatepickerPopupWrap", function () {
      return {
        restrict: "A",
        transclude: true,
        templateUrl: function (element, attrs) {
          return attrs.templateUrl || "uib/template/datepickerPopup/popup.html";
        }
      };
    });
  
  angular
    .module("ui.bootstrap.debounce", [])
    /**
     * A helper, internal service that debounces a function
     */
    .factory("$$debounce", [
      "$timeout",
      function ($timeout) {
        return function (callback, debounceTime) {
          var timeoutPromise;
  
          return function () {
            var self = this;
            var args = Array.prototype.slice.call(arguments);
            if (timeoutPromise) {
              $timeout.cancel(timeoutPromise);
            }
  
            timeoutPromise = $timeout(function () {
              callback.apply(self, args);
            }, debounceTime);
          };
        };
      }
    ]);
  
  angular
    .module("ui.bootstrap.multiMap", [])
    /**
     * A helper, internal data structure that stores all references attached to key
     */
    .factory("$$multiMap", function () {
      return {
        createNew: function () {
          var map = {};
  
          return {
            entries: function () {
              return Object.keys(map).map(function (key) {
                return {
                  key: key,
                  value: map[key]
                };
              });
            },
            get: function (key) {
              return map[key];
            },
            hasKey: function (key) {
              return !!map[key];
            },
            keys: function () {
              return Object.keys(map);
            },
            put: function (key, value) {
              if (!map[key]) {
                map[key] = [];
              }
  
              map[key].push(value);
            },
            remove: function (key, value) {
              var values = map[key];
  
              if (!values) {
                return;
              }
  
              var idx = values.indexOf(value);
  
              if (idx !== -1) {
                values.splice(idx, 1);
              }
  
              if (!values.length) {
                delete map[key];
              }
            }
          };
        }
      };
    });
  
  angular
    .module("ui.bootstrap.dropdown", ["ui.bootstrap.multiMap", "ui.bootstrap.position"])
  
    .constant("uibDropdownConfig", {
      appendToOpenClass: "uib-dropdown-open",
      openClass: "open"
    })
  
    .service("uibDropdownService", [
      "$document",
      "$rootScope",
      "$$multiMap",
      function ($document, $rootScope, $$multiMap) {
        var openScope = null;
        var openedContainers = $$multiMap.createNew();
  
        this.isOnlyOpen = function (dropdownScope, appendTo) {
          var openedDropdowns = openedContainers.get(appendTo);
          if (openedDropdowns) {
            var openDropdown = openedDropdowns.reduce(function (toClose, dropdown) {
              if (dropdown.scope === dropdownScope) {
                return dropdown;
              }
  
              return toClose;
            }, {});
            if (openDropdown) {
              return openedDropdowns.length === 1;
            }
          }
  
          return false;
        };
  
        this.open = function (dropdownScope, element, appendTo) {
          if (!openScope) {
            $document.on("click", closeDropdown);
          }
  
          if (openScope && openScope !== dropdownScope) {
            openScope.isOpen = false;
          }
  
          openScope = dropdownScope;
  
          if (!appendTo) {
            return;
          }
  
          var openedDropdowns = openedContainers.get(appendTo);
          if (openedDropdowns) {
            var openedScopes = openedDropdowns.map(function (dropdown) {
              return dropdown.scope;
            });
            if (openedScopes.indexOf(dropdownScope) === -1) {
              openedContainers.put(appendTo, {
                scope: dropdownScope
              });
            }
          } else {
            openedContainers.put(appendTo, {
              scope: dropdownScope
            });
          }
        };
  
        this.close = function (dropdownScope, element, appendTo) {
          if (openScope === dropdownScope) {
            $document.off("click", closeDropdown);
            $document.off("keydown", this.keybindFilter);
            openScope = null;
          }
  
          if (!appendTo) {
            return;
          }
  
          var openedDropdowns = openedContainers.get(appendTo);
          if (openedDropdowns) {
            var dropdownToClose = openedDropdowns.reduce(function (toClose, dropdown) {
              if (dropdown.scope === dropdownScope) {
                return dropdown;
              }
  
              return toClose;
            }, {});
            if (dropdownToClose) {
              openedContainers.remove(appendTo, dropdownToClose);
            }
          }
        };
  
        var closeDropdown = function (evt) {
          // This method may still be called during the same mouse event that
          // unbound this event handler. So check openScope before proceeding.
          if (!openScope || !openScope.isOpen) {
            return;
          }
  
          if (evt && openScope.getAutoClose() === "disabled") {
            return;
          }
  
          if (evt && evt.which === 3) {
            return;
          }
  
          var toggleElement = openScope.getToggleElement();
          if (evt && toggleElement && toggleElement[0].contains(evt.target)) {
            return;
          }
  
          var dropdownElement = openScope.getDropdownElement();
          if (
            evt &&
            openScope.getAutoClose() === "outsideClick" &&
            dropdownElement &&
            dropdownElement[0].contains(evt.target)
          ) {
            return;
          }
  
          openScope.focusToggleElement();
          openScope.isOpen = false;
  
          if (!$rootScope.$$phase) {
            openScope.$apply();
          }
        };
  
        this.keybindFilter = function (evt) {
          if (!openScope) {
            // see this.close as ESC could have been pressed which kills the scope so we can not proceed
            return;
          }
  
          var dropdownElement = openScope.getDropdownElement();
          var toggleElement = openScope.getToggleElement();
          var dropdownElementTargeted = dropdownElement && dropdownElement[0].contains(evt.target);
          var toggleElementTargeted = toggleElement && toggleElement[0].contains(evt.target);
          if (evt.which === 27) {
            evt.stopPropagation();
            openScope.focusToggleElement();
            closeDropdown();
          } else if (
            openScope.isKeynavEnabled() &&
            [38, 40].indexOf(evt.which) !== -1 &&
            openScope.isOpen &&
            (dropdownElementTargeted || toggleElementTargeted)
          ) {
            evt.preventDefault();
            evt.stopPropagation();
            openScope.focusDropdownEntry(evt.which);
          }
        };
      }
    ])
  
    .controller("UibDropdownController", [
      "$scope",
      "$element",
      "$attrs",
      "$parse",
      "uibDropdownConfig",
      "uibDropdownService",
      "$animate",
      "$uibPosition",
      "$document",
      "$compile",
      "$templateRequest",
      function (
        $scope,
        $element,
        $attrs,
        $parse,
        dropdownConfig,
        uibDropdownService,
        $animate,
        $position,
        $document,
        $compile,
        $templateRequest
      ) {
        var self = this,
          scope = $scope.$new(), // create a child scope so we are not polluting original one
          templateScope,
          appendToOpenClass = dropdownConfig.appendToOpenClass,
          openClass = dropdownConfig.openClass,
          getIsOpen,
          setIsOpen = angular.noop,
          toggleInvoker = $attrs.onToggle ? $parse($attrs.onToggle) : angular.noop,
          keynavEnabled = false,
          selectedOption = null,
          body = $document.find("body");
  
        $element.addClass("dropdown");
  
        this.init = function () {
          if ($attrs.isOpen) {
            getIsOpen = $parse($attrs.isOpen);
            setIsOpen = getIsOpen.assign;
  
            $scope.$watch(getIsOpen, function (value) {
              scope.isOpen = !!value;
            });
          }
  
          keynavEnabled = angular.isDefined($attrs.keyboardNav);
        };
  
        this.toggle = function (open) {
          scope.isOpen = arguments.length ? !!open : !scope.isOpen;
          if (angular.isFunction(setIsOpen)) {
            setIsOpen(scope, scope.isOpen);
          }
  
          return scope.isOpen;
        };
  
        // Allow other directives to watch status
        this.isOpen = function () {
          return scope.isOpen;
        };
  
        scope.getToggleElement = function () {
          return self.toggleElement;
        };
  
        scope.getAutoClose = function () {
          return $attrs.autoClose || "always"; //or 'outsideClick' or 'disabled'
        };
  
        scope.getElement = function () {
          return $element;
        };
  
        scope.isKeynavEnabled = function () {
          return keynavEnabled;
        };
  
        scope.focusDropdownEntry = function (keyCode) {
          var elems = self.dropdownMenu //If append to body is used.
            ? angular.element(self.dropdownMenu).find("a")
            : $element.find("ul").eq(0).find("a");
  
          switch (keyCode) {
            case 40: {
              if (!angular.isNumber(self.selectedOption)) {
                self.selectedOption = 0;
              } else {
                self.selectedOption =
                  self.selectedOption === elems.length - 1 ? self.selectedOption : self.selectedOption + 1;
              }
              break;
            }
            case 38: {
              if (!angular.isNumber(self.selectedOption)) {
                self.selectedOption = elems.length - 1;
              } else {
                self.selectedOption = self.selectedOption === 0 ? 0 : self.selectedOption - 1;
              }
              break;
            }
          }
          elems[self.selectedOption].focus();
        };
  
        scope.getDropdownElement = function () {
          return self.dropdownMenu;
        };
  
        scope.focusToggleElement = function () {
          if (self.toggleElement) {
            self.toggleElement[0].focus();
          }
        };
  
        function removeDropdownMenu() {
          $element.append(self.dropdownMenu);
        }
  
        scope.$watch("isOpen", function (isOpen, wasOpen) {
          var appendTo = null,
            appendToBody = false;
  
          if (angular.isDefined($attrs.dropdownAppendTo)) {
            var appendToEl = $parse($attrs.dropdownAppendTo)(scope);
            if (appendToEl) {
              appendTo = angular.element(appendToEl);
            }
          }
  
          if (angular.isDefined($attrs.dropdownAppendToBody)) {
            var appendToBodyValue = $parse($attrs.dropdownAppendToBody)(scope);
            if (appendToBodyValue !== false) {
              appendToBody = true;
            }
          }
  
          if (appendToBody && !appendTo) {
            appendTo = body;
          }
  
          if (appendTo && self.dropdownMenu) {
            if (isOpen) {
              appendTo.append(self.dropdownMenu);
              $element.on("$destroy", removeDropdownMenu);
            } else {
              $element.off("$destroy", removeDropdownMenu);
              removeDropdownMenu();
            }
          }
  
          if (appendTo && self.dropdownMenu) {
            var pos = $position.positionElements($element, self.dropdownMenu, "bottom-left", true),
              css,
              rightalign,
              scrollbarPadding,
              scrollbarWidth = 0;
  
            css = {
              top: pos.top + "px",
              display: isOpen ? "block" : "none"
            };
  
            rightalign = self.dropdownMenu.hasClass("dropdown-menu-right");
            if (!rightalign) {
              css.left = pos.left + "px";
              css.right = "auto";
            } else {
              css.left = "auto";
              scrollbarPadding = $position.scrollbarPadding(appendTo);
  
              if (scrollbarPadding.heightOverflow && scrollbarPadding.scrollbarWidth) {
                scrollbarWidth = scrollbarPadding.scrollbarWidth;
              }
  
              css.right = window.innerWidth - scrollbarWidth - (pos.left + $element.prop("offsetWidth")) + "px";
            }
  
            // Need to adjust our positioning to be relative to the appendTo container
            // if it's not the body element
            if (!appendToBody) {
              var appendOffset = $position.offset(appendTo);
  
              css.top = pos.top - appendOffset.top + "px";
  
              if (!rightalign) {
                css.left = pos.left - appendOffset.left + "px";
              } else {
                css.right = window.innerWidth - (pos.left - appendOffset.left + $element.prop("offsetWidth")) + "px";
              }
            }
  
            self.dropdownMenu.css(css);
          }
  
          var openContainer = appendTo ? appendTo : $element;
          var dropdownOpenClass = appendTo ? appendToOpenClass : openClass;
          var hasOpenClass = openContainer.hasClass(dropdownOpenClass);
          var isOnlyOpen = uibDropdownService.isOnlyOpen($scope, appendTo);
  
          if (hasOpenClass === !isOpen) {
            var toggleClass;
            if (appendTo) {
              toggleClass = !isOnlyOpen ? "addClass" : "removeClass";
            } else {
              toggleClass = isOpen ? "addClass" : "removeClass";
            }
            $animate[toggleClass](openContainer, dropdownOpenClass).then(function () {
              if (angular.isDefined(isOpen) && isOpen !== wasOpen) {
                toggleInvoker($scope, { open: !!isOpen });
              }
            });
          }
  
          if (isOpen) {
            if (self.dropdownMenuTemplateUrl) {
              $templateRequest(self.dropdownMenuTemplateUrl).then(function (tplContent) {
                templateScope = scope.$new();
                $compile(tplContent.trim())(templateScope, function (dropdownElement) {
                  var newEl = dropdownElement;
                  self.dropdownMenu.replaceWith(newEl);
                  self.dropdownMenu = newEl;
                  $document.on("keydown", uibDropdownService.keybindFilter);
                });
              });
            } else {
              $document.on("keydown", uibDropdownService.keybindFilter);
            }
  
            scope.focusToggleElement();
            uibDropdownService.open(scope, $element, appendTo);
          } else {
            uibDropdownService.close(scope, $element, appendTo);
            if (self.dropdownMenuTemplateUrl) {
              if (templateScope) {
                templateScope.$destroy();
              }
              var newEl = angular.element('<ul class="dropdown-menu"></ul>');
              self.dropdownMenu.replaceWith(newEl);
              self.dropdownMenu = newEl;
            }
  
            self.selectedOption = null;
          }
  
          if (angular.isFunction(setIsOpen)) {
            setIsOpen($scope, isOpen);
          }
        });
      }
    ])
  
    .directive("uibDropdown", function () {
      return {
        controller: "UibDropdownController",
        link: function (scope, element, attrs, dropdownCtrl) {
          dropdownCtrl.init();
        }
      };
    })
  
    .directive("uibDropdownMenu", function () {
      return {
        restrict: "A",
        require: "?^uibDropdown",
        link: function (scope, element, attrs, dropdownCtrl) {
          if (!dropdownCtrl || angular.isDefined(attrs.dropdownNested)) {
            return;
          }
  
          element.addClass("dropdown-menu");
  
          var tplUrl = attrs.templateUrl;
          if (tplUrl) {
            dropdownCtrl.dropdownMenuTemplateUrl = tplUrl;
          }
  
          if (!dropdownCtrl.dropdownMenu) {
            dropdownCtrl.dropdownMenu = element;
          }
        }
      };
    })
  
    .directive("uibDropdownToggle", function () {
      return {
        require: "?^uibDropdown",
        link: function (scope, element, attrs, dropdownCtrl) {
          if (!dropdownCtrl) {
            return;
          }
  
          element.addClass("dropdown-toggle");
  
          dropdownCtrl.toggleElement = element;
  
          var toggleDropdown = function (event) {
            event.preventDefault();
  
            if (!element.hasClass("disabled") && !attrs.disabled) {
              scope.$apply(function () {
                dropdownCtrl.toggle();
              });
            }
          };
  
          element.on("click", toggleDropdown);
  
          // WAI-ARIA
          element.attr({ "aria-haspopup": true, "aria-expanded": false });
          scope.$watch(dropdownCtrl.isOpen, function (isOpen) {
            element.attr("aria-expanded", !!isOpen);
          });
  
          scope.$on("$destroy", function () {
            element.off("click", toggleDropdown);
          });
        }
      };
    });
  
  angular
    .module("ui.bootstrap.stackedMap", [])
    /**
     * A helper, internal data structure that acts as a map but also allows getting / removing
     * elements in the LIFO order
     */
    .factory("$$stackedMap", function () {
      return {
        createNew: function () {
          var stack = [];
  
          return {
            add: function (key, value) {
              stack.push({
                key: key,
                value: value
              });
            },
            get: function (key) {
              for (var i = 0; i < stack.length; i++) {
                if (key === stack[i].key) {
                  return stack[i];
                }
              }
            },
            keys: function () {
              var keys = [];
              for (var i = 0; i < stack.length; i++) {
                keys.push(stack[i].key);
              }
              return keys;
            },
            top: function () {
              return stack[stack.length - 1];
            },
            remove: function (key) {
              var idx = -1;
              for (var i = 0; i < stack.length; i++) {
                if (key === stack[i].key) {
                  idx = i;
                  break;
                }
              }
              return stack.splice(idx, 1)[0];
            },
            removeTop: function () {
              return stack.pop();
            },
            length: function () {
              return stack.length;
            }
          };
        }
      };
    });
  angular
    .module("ui.bootstrap.modal", ["ui.bootstrap.multiMap", "ui.bootstrap.stackedMap", "ui.bootstrap.position"])
    /**
     * Pluggable resolve mechanism for the modal resolve resolution
     * Supports UI Router's $resolve service
     */
    .provider("$uibResolve", function () {
      var resolve = this;
      this.resolver = null;
  
      this.setResolver = function (resolver) {
        this.resolver = resolver;
      };
  
      this.$get = [
        "$injector",
        "$q",
        function ($injector, $q) {
          var resolver = resolve.resolver ? $injector.get(resolve.resolver) : null;
          return {
            resolve: function (invocables, locals, parent, self) {
              if (resolver) {
                return resolver.resolve(invocables, locals, parent, self);
              }
  
              var promises = [];
  
              angular.forEach(invocables, function (value) {
                if (angular.isFunction(value) || angular.isArray(value)) {
                  promises.push($q.resolve($injector.invoke(value)));
                } else if (angular.isString(value)) {
                  promises.push($q.resolve($injector.get(value)));
                } else {
                  promises.push($q.resolve(value));
                }
              });
  
              return $q.all(promises).then(function (resolves) {
                var resolveObj = {};
                var resolveIter = 0;
                angular.forEach(invocables, function (value, key) {
                  resolveObj[key] = resolves[resolveIter++];
                });
  
                return resolveObj;
              });
            }
          };
        }
      ];
    })
  
    /**
     * A helper directive for the $modal service. It creates a backdrop element.
     */
    .directive("uibModalBackdrop", [
      "$animate",
      "$injector",
      "$uibModalStack",
      function ($animate, $injector, $modalStack) {
        return {
          restrict: "A",
          compile: function (tElement, tAttrs) {
            tElement.addClass(tAttrs.backdropClass);
            return linkFn;
          }
        };
  
        function linkFn(scope, element, attrs) {
          if (attrs.modalInClass) {
            $animate.addClass(element, attrs.modalInClass);
  
            scope.$on($modalStack.NOW_CLOSING_EVENT, function (e, setIsAsync) {
              var done = setIsAsync();
              if (scope.modalOptions.animation) {
                $animate.removeClass(element, attrs.modalInClass).then(done);
              } else {
                done();
              }
            });
          }
        }
      }
    ])
  
    .directive("uibModalWindow", [
      "$uibModalStack",
      "$q",
      "$animateCss",
      "$document",
      function ($modalStack, $q, $animateCss, $document) {
        return {
          scope: {
            index: "@"
          },
          restrict: "A",
          transclude: true,
          templateUrl: function (tElement, tAttrs) {
            return tAttrs.templateUrl || "uib/template/modal/window.html";
          },
          link: function (scope, element, attrs) {
            element.addClass(attrs.windowTopClass || "");
            scope.size = attrs.size;
  
            scope.close = function (evt) {
              var modal = $modalStack.getTop();
              if (
                modal &&
                modal.value.backdrop &&
                modal.value.backdrop !== "static" &&
                evt.target === evt.currentTarget
              ) {
                evt.preventDefault();
                evt.stopPropagation();
                $modalStack.dismiss(modal.key, "backdrop click");
              }
            };
  
            // moved from template to fix issue #2280
            element.on("click", scope.close);
  
            // This property is only added to the scope for the purpose of detecting when this directive is rendered.
            // We can detect that by using this property in the template associated with this directive and then use
            // {@link Attribute#$observe} on it. For more details please see {@link TableColumnResize}.
            scope.$isRendered = true;
  
            // Deferred object that will be resolved when this modal is rendered.
            var modalRenderDeferObj = $q.defer();
            // Resolve render promise post-digest
            scope.$$postDigest(function () {
              modalRenderDeferObj.resolve();
            });
  
            modalRenderDeferObj.promise.then(function () {
              var animationPromise = null;
  
              if (attrs.modalInClass) {
                animationPromise = $animateCss(element, {
                  addClass: attrs.modalInClass
                }).start();
  
                scope.$on($modalStack.NOW_CLOSING_EVENT, function (e, setIsAsync) {
                  var done = setIsAsync();
                  $animateCss(element, {
                    removeClass: attrs.modalInClass
                  })
                    .start()
                    .then(done);
                });
              }
  
              $q.when(animationPromise).then(function () {
                // Notify {@link $modalStack} that modal is rendered.
                var modal = $modalStack.getTop();
                if (modal) {
                  $modalStack.modalRendered(modal.key);
                }
  
                /**
                 * If something within the freshly-opened modal already has focus (perhaps via a
                 * directive that causes focus) then there's no need to try to focus anything.
                 */
                if (!($document[0].activeElement && element[0].contains($document[0].activeElement))) {
                  var inputWithAutofocus = element[0].querySelector("[autofocus]");
                  /**
                   * Auto-focusing of a freshly-opened modal element causes any child elements
                   * with the autofocus attribute to lose focus. This is an issue on touch
                   * based devices which will show and then hide the onscreen keyboard.
                   * Attempts to refocus the autofocus element via JavaScript will not reopen
                   * the onscreen keyboard. Fixed by updated the focusing logic to only autofocus
                   * the modal element if the modal does not contain an autofocus element.
                   */
                  if (inputWithAutofocus) {
                    inputWithAutofocus.focus();
                  } else {
                    element[0].focus();
                  }
                }
              });
            });
          }
        };
      }
    ])
  
    .directive("uibModalAnimationClass", function () {
      return {
        compile: function (tElement, tAttrs) {
          if (tAttrs.modalAnimation) {
            tElement.addClass(tAttrs.uibModalAnimationClass);
          }
        }
      };
    })
  
    .directive("uibModalTransclude", [
      "$animate",
      function ($animate) {
        return {
          link: function (scope, element, attrs, controller, transclude) {
            transclude(scope.$parent, function (clone) {
              element.empty();
              $animate.enter(clone, element);
            });
          }
        };
      }
    ])
  
    .factory("$uibModalStack", [
      "$animate",
      "$animateCss",
      "$document",
      "$compile",
      "$rootScope",
      "$q",
      "$$multiMap",
      "$$stackedMap",
      "$uibPosition",
      function ($animate, $animateCss, $document, $compile, $rootScope, $q, $$multiMap, $$stackedMap, $uibPosition) {
        var OPENED_MODAL_CLASS = "modal-open";
  
        var backdropDomEl, backdropScope;
        var openedWindows = $$stackedMap.createNew();
        var openedClasses = $$multiMap.createNew();
        var $modalStack = {
          NOW_CLOSING_EVENT: "modal.stack.now-closing"
        };
        var topModalIndex = 0;
        var previousTopOpenedModal = null;
        var ARIA_HIDDEN_ATTRIBUTE_NAME = "data-bootstrap-modal-aria-hidden-count";
  
        //Modal focus behavior
        var tabbableSelector =
          "a[href], area[href], input:not([disabled]):not([tabindex='-1']), " +
          "button:not([disabled]):not([tabindex='-1']),select:not([disabled]):not([tabindex='-1']), textarea:not([disabled]):not([tabindex='-1']), " +
          "iframe, object, embed, *[tabindex]:not([tabindex='-1']), *[contenteditable=true]";
        var scrollbarPadding;
        var SNAKE_CASE_REGEXP = /[A-Z]/g;
  
        // TODO: extract into common dependency with tooltip
        function snake_case(name) {
          var separator = "-";
          return name.replace(SNAKE_CASE_REGEXP, function (letter, pos) {
            return (pos ? separator : "") + letter.toLowerCase();
          });
        }
  
        function isVisible(element) {
          return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
        }
  
        function backdropIndex() {
          var topBackdropIndex = -1;
          var opened = openedWindows.keys();
          for (var i = 0; i < opened.length; i++) {
            if (openedWindows.get(opened[i]).value.backdrop) {
              topBackdropIndex = i;
            }
          }
  
          // If any backdrop exist, ensure that it's index is always
          // right below the top modal
          if (topBackdropIndex > -1 && topBackdropIndex < topModalIndex) {
            topBackdropIndex = topModalIndex;
          }
          return topBackdropIndex;
        }
  
        $rootScope.$watch(backdropIndex, function (newBackdropIndex) {
          if (backdropScope) {
            backdropScope.index = newBackdropIndex;
          }
        });
  
        function removeModalWindow(modalInstance, elementToReceiveFocus) {
          var modalWindow = openedWindows.get(modalInstance).value;
          var appendToElement = modalWindow.appendTo;
  
          //clean up the stack
          openedWindows.remove(modalInstance);
          previousTopOpenedModal = openedWindows.top();
          if (previousTopOpenedModal) {
            topModalIndex = parseInt(previousTopOpenedModal.value.modalDomEl.attr("index"), 10);
          }
  
          removeAfterAnimate(
            modalWindow.modalDomEl,
            modalWindow.modalScope,
            function () {
              var modalBodyClass = modalWindow.openedClass || OPENED_MODAL_CLASS;
              openedClasses.remove(modalBodyClass, modalInstance);
              var areAnyOpen = openedClasses.hasKey(modalBodyClass);
              appendToElement.toggleClass(modalBodyClass, areAnyOpen);
              if (!areAnyOpen && scrollbarPadding && scrollbarPadding.heightOverflow && scrollbarPadding.scrollbarWidth) {
                if (scrollbarPadding.originalRight) {
                  appendToElement.css({ paddingRight: scrollbarPadding.originalRight + "px" });
                } else {
                  appendToElement.css({ paddingRight: "" });
                }
                scrollbarPadding = null;
              }
              toggleTopWindowClass(true);
            },
            modalWindow.closedDeferred
          );
          checkRemoveBackdrop();
  
          //move focus to specified element if available, or else to body
          if (elementToReceiveFocus && elementToReceiveFocus.focus) {
            elementToReceiveFocus.focus();
          } else if (appendToElement.focus) {
            appendToElement.focus();
          }
        }
  
        // Add or remove "windowTopClass" from the top window in the stack
        function toggleTopWindowClass(toggleSwitch) {
          var modalWindow;
  
          if (openedWindows.length() > 0) {
            modalWindow = openedWindows.top().value;
            modalWindow.modalDomEl.toggleClass(modalWindow.windowTopClass || "", toggleSwitch);
          }
        }
  
        function checkRemoveBackdrop() {
          //remove backdrop if no longer needed
          if (backdropDomEl && backdropIndex() === -1) {
            var backdropScopeRef = backdropScope;
            removeAfterAnimate(backdropDomEl, backdropScope, function () {
              backdropScopeRef = null;
            });
            backdropDomEl = undefined;
            backdropScope = undefined;
          }
        }
  
        function removeAfterAnimate(domEl, scope, done, closedDeferred) {
          var asyncDeferred;
          var asyncPromise = null;
          var setIsAsync = function () {
            if (!asyncDeferred) {
              asyncDeferred = $q.defer();
              asyncPromise = asyncDeferred.promise;
            }
  
            return function asyncDone() {
              asyncDeferred.resolve();
            };
          };
          scope.$broadcast($modalStack.NOW_CLOSING_EVENT, setIsAsync);
  
          // Note that it's intentional that asyncPromise might be null.
          // That's when setIsAsync has not been called during the
          // NOW_CLOSING_EVENT broadcast.
          return $q.when(asyncPromise).then(afterAnimating);
  
          function afterAnimating() {
            if (afterAnimating.done) {
              return;
            }
            afterAnimating.done = true;
  
            $animate.leave(domEl).then(function () {
              if (done) {
                done();
              }
  
              domEl.remove();
              if (closedDeferred) {
                closedDeferred.resolve();
              }
            });
  
            scope.$destroy();
          }
        }
  
        $document.on("keydown", keydownListener);
  
        $rootScope.$on("$destroy", function () {
          $document.off("keydown", keydownListener);
        });
  
        function keydownListener(evt) {
          if (evt.isDefaultPrevented()) {
            return evt;
          }
  
          var modal = openedWindows.top();
          if (modal) {
            switch (evt.which) {
              case 27: {
                if (modal.value.keyboard) {
                  evt.preventDefault();
                  $rootScope.$apply(function () {
                    $modalStack.dismiss(modal.key, "escape key press");
                  });
                }
                break;
              }
              case 9: {
                var list = $modalStack.loadFocusElementList(modal);
                var focusChanged = false;
                if (evt.shiftKey) {
                  if ($modalStack.isFocusInFirstItem(evt, list) || $modalStack.isModalFocused(evt, modal)) {
                    focusChanged = $modalStack.focusLastFocusableElement(list);
                  }
                } else {
                  if ($modalStack.isFocusInLastItem(evt, list)) {
                    focusChanged = $modalStack.focusFirstFocusableElement(list);
                  }
                }
  
                if (focusChanged) {
                  evt.preventDefault();
                  evt.stopPropagation();
                }
  
                break;
              }
            }
          }
        }
  
        $modalStack.open = function (modalInstance, modal) {
          var modalOpener = $document[0].activeElement,
            modalBodyClass = modal.openedClass || OPENED_MODAL_CLASS;
  
          toggleTopWindowClass(false);
  
          // Store the current top first, to determine what index we ought to use
          // for the current top modal
          previousTopOpenedModal = openedWindows.top();
  
          openedWindows.add(modalInstance, {
            deferred: modal.deferred,
            renderDeferred: modal.renderDeferred,
            closedDeferred: modal.closedDeferred,
            modalScope: modal.scope,
            backdrop: modal.backdrop,
            keyboard: modal.keyboard,
            openedClass: modal.openedClass,
            windowTopClass: modal.windowTopClass,
            animation: modal.animation,
            appendTo: modal.appendTo
          });
  
          openedClasses.put(modalBodyClass, modalInstance);
  
          var appendToElement = modal.appendTo,
            currBackdropIndex = backdropIndex();
  
          if (currBackdropIndex >= 0 && !backdropDomEl) {
            backdropScope = $rootScope.$new(true);
            backdropScope.modalOptions = modal;
            backdropScope.index = currBackdropIndex;
            backdropDomEl = angular.element('<div uib-modal-backdrop="modal-backdrop"></div>');
            backdropDomEl.attr({
              class: "modal-backdrop",
              "ng-style": "{'z-index': 1040 + (index && 1 || 0) + index*10}",
              "uib-modal-animation-class": "fade",
              "modal-in-class": "in"
            });
            if (modal.backdropClass) {
              backdropDomEl.addClass(modal.backdropClass);
            }
  
            if (modal.animation) {
              backdropDomEl.attr("modal-animation", "true");
            }
            $compile(backdropDomEl)(backdropScope);
            $animate.enter(backdropDomEl, appendToElement);
            if ($uibPosition.isScrollable(appendToElement)) {
              scrollbarPadding = $uibPosition.scrollbarPadding(appendToElement);
              if (scrollbarPadding.heightOverflow && scrollbarPadding.scrollbarWidth) {
                appendToElement.css({ paddingRight: scrollbarPadding.right + "px" });
              }
            }
          }
  
          var content;
          if (modal.component) {
            content = document.createElement(snake_case(modal.component.name));
            content = angular.element(content);
            content.attr({
              resolve: "$resolve",
              "modal-instance": "$uibModalInstance",
              close: "$close($value)",
              dismiss: "$dismiss($value)"
            });
          } else {
            content = modal.content;
          }
  
          // Set the top modal index based on the index of the previous top modal
          topModalIndex = previousTopOpenedModal
            ? parseInt(previousTopOpenedModal.value.modalDomEl.attr("index"), 10) + 1
            : 0;
          var angularDomEl = angular.element('<div uib-modal-window="modal-window"></div>');
          angularDomEl
            .attr({
              class: "modal",
              "template-url": modal.windowTemplateUrl,
              "window-top-class": modal.windowTopClass,
              role: "dialog",
              "aria-labelledby": modal.ariaLabelledBy,
              "aria-describedby": modal.ariaDescribedBy,
              size: modal.size,
              index: topModalIndex,
              animate: "animate",
              "ng-style": "{'z-index': 1050 + $$topModalIndex*10, display: 'block'}",
              tabindex: -1,
              "uib-modal-animation-class": "fade",
              "modal-in-class": "in"
            })
            .append(content);
          if (modal.windowClass) {
            angularDomEl.addClass(modal.windowClass);
          }
  
          if (modal.animation) {
            angularDomEl.attr("modal-animation", "true");
          }
  
          appendToElement.addClass(modalBodyClass);
          if (modal.scope) {
            // we need to explicitly add the modal index to the modal scope
            // because it is needed by ngStyle to compute the zIndex property.
            modal.scope.$$topModalIndex = topModalIndex;
          }
          $animate.enter($compile(angularDomEl)(modal.scope), appendToElement);
  
          openedWindows.top().value.modalDomEl = angularDomEl;
          openedWindows.top().value.modalOpener = modalOpener;
  
          applyAriaHidden(angularDomEl);
  
          function applyAriaHidden(el) {
            if (!el || el[0].tagName === "BODY") {
              return;
            }
  
            getSiblings(el).forEach(function (sibling) {
              var elemIsAlreadyHidden = sibling.getAttribute("aria-hidden") === "true",
                ariaHiddenCount = parseInt(sibling.getAttribute(ARIA_HIDDEN_ATTRIBUTE_NAME), 10);
  
              if (!ariaHiddenCount) {
                ariaHiddenCount = elemIsAlreadyHidden ? 1 : 0;
              }
  
              sibling.setAttribute(ARIA_HIDDEN_ATTRIBUTE_NAME, ariaHiddenCount + 1);
              sibling.setAttribute("aria-hidden", "true");
            });
  
            return applyAriaHidden(el.parent());
  
            function getSiblings(el) {
              var children = el.parent() ? el.parent().children() : [];
  
              return Array.prototype.filter.call(children, function (child) {
                return child !== el[0];
              });
            }
          }
        };
  
        function broadcastClosing(modalWindow, resultOrReason, closing) {
          return !modalWindow.value.modalScope.$broadcast("modal.closing", resultOrReason, closing).defaultPrevented;
        }
  
        function unhideBackgroundElements() {
          Array.prototype.forEach.call(document.querySelectorAll("[" + ARIA_HIDDEN_ATTRIBUTE_NAME + "]"), function (
            hiddenEl
          ) {
            var ariaHiddenCount = parseInt(hiddenEl.getAttribute(ARIA_HIDDEN_ATTRIBUTE_NAME), 10),
              newHiddenCount = ariaHiddenCount - 1;
            hiddenEl.setAttribute(ARIA_HIDDEN_ATTRIBUTE_NAME, newHiddenCount);
  
            if (!newHiddenCount) {
              hiddenEl.removeAttribute(ARIA_HIDDEN_ATTRIBUTE_NAME);
              hiddenEl.removeAttribute("aria-hidden");
            }
          });
        }
  
        $modalStack.close = function (modalInstance, result) {
          var modalWindow = openedWindows.get(modalInstance);
          unhideBackgroundElements();
          if (modalWindow && broadcastClosing(modalWindow, result, true)) {
            modalWindow.value.modalScope.$$uibDestructionScheduled = true;
            modalWindow.value.deferred.resolve(result);
            removeModalWindow(modalInstance, modalWindow.value.modalOpener);
            return true;
          }
  
          return !modalWindow;
        };
  
        $modalStack.dismiss = function (modalInstance, reason) {
          var modalWindow = openedWindows.get(modalInstance);
          unhideBackgroundElements();
          if (modalWindow && broadcastClosing(modalWindow, reason, false)) {
            modalWindow.value.modalScope.$$uibDestructionScheduled = true;
            modalWindow.value.deferred.reject(reason);
            removeModalWindow(modalInstance, modalWindow.value.modalOpener);
            return true;
          }
          return !modalWindow;
        };
  
        $modalStack.dismissAll = function (reason) {
          var topModal = this.getTop();
          while (topModal && this.dismiss(topModal.key, reason)) {
            topModal = this.getTop();
          }
        };
  
        $modalStack.getTop = function () {
          return openedWindows.top();
        };
  
        $modalStack.modalRendered = function (modalInstance) {
          var modalWindow = openedWindows.get(modalInstance);
          if (modalWindow) {
            modalWindow.value.renderDeferred.resolve();
          }
        };
  
        $modalStack.focusFirstFocusableElement = function (list) {
          if (list.length > 0) {
            list[0].focus();
            return true;
          }
          return false;
        };
  
        $modalStack.focusLastFocusableElement = function (list) {
          if (list.length > 0) {
            list[list.length - 1].focus();
            return true;
          }
          return false;
        };
  
        $modalStack.isModalFocused = function (evt, modalWindow) {
          if (evt && modalWindow) {
            var modalDomEl = modalWindow.value.modalDomEl;
            if (modalDomEl && modalDomEl.length) {
              return (evt.target || evt.srcElement) === modalDomEl[0];
            }
          }
          return false;
        };
  
        $modalStack.isFocusInFirstItem = function (evt, list) {
          if (list.length > 0) {
            return (evt.target || evt.srcElement) === list[0];
          }
          return false;
        };
  
        $modalStack.isFocusInLastItem = function (evt, list) {
          if (list.length > 0) {
            return (evt.target || evt.srcElement) === list[list.length - 1];
          }
          return false;
        };
  
        $modalStack.loadFocusElementList = function (modalWindow) {
          if (modalWindow) {
            var modalDomE1 = modalWindow.value.modalDomEl;
            if (modalDomE1 && modalDomE1.length) {
              var elements = modalDomE1[0].querySelectorAll(tabbableSelector);
              return elements
                ? Array.prototype.filter.call(elements, function (element) {
                    return isVisible(element);
                  })
                : elements;
            }
          }
        };
  
        return $modalStack;
      }
    ])
  
    .provider("$uibModal", function () {
      var $modalProvider = {
        options: {
          animation: true,
          backdrop: true, //can also be false or 'static'
          keyboard: true
        },
        $get: [
          "$rootScope",
          "$q",
          "$document",
          "$templateRequest",
          "$controller",
          "$uibResolve",
          "$uibModalStack",
          function ($rootScope, $q, $document, $templateRequest, $controller, $uibResolve, $modalStack) {
            var $modal = {};
  
            function getTemplatePromise(options) {
              return options.template
                ? $q.when(options.template)
                : $templateRequest(angular.isFunction(options.templateUrl) ? options.templateUrl() : options.templateUrl);
            }
  
            var promiseChain = null;
            $modal.getPromiseChain = function () {
              return promiseChain;
            };
  
            $modal.open = function (modalOptions) {
              var modalResultDeferred = $q.defer();
              var modalOpenedDeferred = $q.defer();
              var modalClosedDeferred = $q.defer();
              var modalRenderDeferred = $q.defer();
  
              //prepare an instance of a modal to be injected into controllers and returned to a caller
              var modalInstance = {
                result: modalResultDeferred.promise,
                opened: modalOpenedDeferred.promise,
                closed: modalClosedDeferred.promise,
                rendered: modalRenderDeferred.promise,
                close: function (result) {
                  return $modalStack.close(modalInstance, result);
                },
                dismiss: function (reason) {
                  return $modalStack.dismiss(modalInstance, reason);
                }
              };
  
              //merge and clean up options
              modalOptions = angular.extend({}, $modalProvider.options, modalOptions);
              modalOptions.resolve = modalOptions.resolve || {};
              modalOptions.appendTo = modalOptions.appendTo || $document.find("body").eq(0);
  
              if (!modalOptions.appendTo.length) {
                throw new Error("appendTo element not found. Make sure that the element passed is in DOM.");
              }
  
              //verify options
              if (!modalOptions.component && !modalOptions.template && !modalOptions.templateUrl) {
                throw new Error("One of component or template or templateUrl options is required.");
              }
  
              var templateAndResolvePromise;
              if (modalOptions.component) {
                templateAndResolvePromise = $q.when($uibResolve.resolve(modalOptions.resolve, {}, null, null));
              } else {
                templateAndResolvePromise = $q.all([
                  getTemplatePromise(modalOptions),
                  $uibResolve.resolve(modalOptions.resolve, {}, null, null)
                ]);
              }
  
              function resolveWithTemplate() {
                return templateAndResolvePromise;
              }
  
              // Wait for the resolution of the existing promise chain.
              // Then switch to our own combined promise dependency (regardless of how the previous modal fared).
              // Then add to $modalStack and resolve opened.
              // Finally clean up the chain variable if no subsequent modal has overwritten it.
              var samePromise;
              samePromise = promiseChain = $q
                .all([promiseChain])
                .then(resolveWithTemplate, resolveWithTemplate)
                .then(
                  function resolveSuccess(tplAndVars) {
                    var providedScope = modalOptions.scope || $rootScope;
  
                    var modalScope = providedScope.$new();
                    modalScope.$close = modalInstance.close;
                    modalScope.$dismiss = modalInstance.dismiss;
  
                    modalScope.$on("$destroy", function () {
                      if (!modalScope.$$uibDestructionScheduled) {
                        modalScope.$dismiss("$uibUnscheduledDestruction");
                      }
                    });
  
                    var modal = {
                      scope: modalScope,
                      deferred: modalResultDeferred,
                      renderDeferred: modalRenderDeferred,
                      closedDeferred: modalClosedDeferred,
                      animation: modalOptions.animation,
                      backdrop: modalOptions.backdrop,
                      keyboard: modalOptions.keyboard,
                      backdropClass: modalOptions.backdropClass,
                      windowTopClass: modalOptions.windowTopClass,
                      windowClass: modalOptions.windowClass,
                      windowTemplateUrl: modalOptions.windowTemplateUrl,
                      ariaLabelledBy: modalOptions.ariaLabelledBy,
                      ariaDescribedBy: modalOptions.ariaDescribedBy,
                      size: modalOptions.size,
                      openedClass: modalOptions.openedClass,
                      appendTo: modalOptions.appendTo
                    };
  
                    var component = {};
                    var ctrlInstance,
                      ctrlInstantiate,
                      ctrlLocals = {};
  
                    if (modalOptions.component) {
                      constructLocals(component, false, true, false);
                      component.name = modalOptions.component;
                      modal.component = component;
                    } else if (modalOptions.controller) {
                      constructLocals(ctrlLocals, true, false, true);
  
                      // the third param will make the controller instantiate later,private api
                      // @see https://github.com/angular/angular.js/blob/master/src/ng/controller.js#L126
                      ctrlInstantiate = $controller(modalOptions.controller, ctrlLocals, true, modalOptions.controllerAs);
                      if (modalOptions.controllerAs && modalOptions.bindToController) {
                        ctrlInstance = ctrlInstantiate.instance;
                        ctrlInstance.$close = modalScope.$close;
                        ctrlInstance.$dismiss = modalScope.$dismiss;
                        angular.extend(
                          ctrlInstance,
                          {
                            $resolve: ctrlLocals.$scope.$resolve
                          },
                          providedScope
                        );
                      }
  
                      ctrlInstance = ctrlInstantiate();
  
                      if (angular.isFunction(ctrlInstance.$onInit)) {
                        ctrlInstance.$onInit();
                      }
                    }
  
                    if (!modalOptions.component) {
                      modal.content = tplAndVars[0];
                    }
  
                    $modalStack.open(modalInstance, modal);
                    modalOpenedDeferred.resolve(true);
  
                    function constructLocals(obj, template, instanceOnScope, injectable) {
                      obj.$scope = modalScope;
                      obj.$scope.$resolve = {};
                      if (instanceOnScope) {
                        obj.$scope.$uibModalInstance = modalInstance;
                      } else {
                        obj.$uibModalInstance = modalInstance;
                      }
  
                      var resolves = template ? tplAndVars[1] : tplAndVars;
                      angular.forEach(resolves, function (value, key) {
                        if (injectable) {
                          obj[key] = value;
                        }
  
                        obj.$scope.$resolve[key] = value;
                      });
                    }
                  },
                  function resolveError(reason) {
                    modalOpenedDeferred.reject(reason);
                    modalResultDeferred.reject(reason);
                  }
                )
                ["finally"](function () {
                  if (promiseChain === samePromise) {
                    promiseChain = null;
                  }
                });
  
              return modalInstance;
            };
  
            return $modal;
          }
        ]
      };
  
      return $modalProvider;
    });
  
  angular
    .module("ui.bootstrap.paging", [])
    /**
     * Helper internal service for generating common controller code between the
     * pager and pagination components
     */
    .factory("uibPaging", [
      "$parse",
      function ($parse) {
        return {
          create: function (ctrl, $scope, $attrs) {
            ctrl.setNumPages = $attrs.numPages ? $parse($attrs.numPages).assign : angular.noop;
            ctrl.ngModelCtrl = { $setViewValue: angular.noop }; // nullModelCtrl
            ctrl._watchers = [];
  
            ctrl.init = function (ngModelCtrl, config) {
              ctrl.ngModelCtrl = ngModelCtrl;
              ctrl.config = config;
  
              ngModelCtrl.$render = function () {
                ctrl.render();
              };
  
              if ($attrs.itemsPerPage) {
                ctrl._watchers.push(
                  $scope.$parent.$watch($attrs.itemsPerPage, function (value) {
                    ctrl.itemsPerPage = parseInt(value, 10);
                    $scope.totalPages = ctrl.calculateTotalPages();
                    ctrl.updatePage();
                  })
                );
              } else {
                ctrl.itemsPerPage = config.itemsPerPage;
              }
  
              $scope.$watch("totalItems", function (newTotal, oldTotal) {
                if (angular.isDefined(newTotal) || newTotal !== oldTotal) {
                  $scope.totalPages = ctrl.calculateTotalPages();
                  ctrl.updatePage();
                }
              });
            };
  
            ctrl.calculateTotalPages = function () {
              var totalPages = ctrl.itemsPerPage < 1 ? 1 : Math.ceil($scope.totalItems / ctrl.itemsPerPage);
              return Math.max(totalPages || 0, 1);
            };
  
            ctrl.render = function () {
              $scope.page = parseInt(ctrl.ngModelCtrl.$viewValue, 10) || 1;
            };
  
            $scope.selectPage = function (page, evt) {
              if (evt) {
                evt.preventDefault();
              }
  
              var clickAllowed = !$scope.ngDisabled || !evt;
              if (clickAllowed && $scope.page !== page && page > 0 && page <= $scope.totalPages) {
                if (evt && evt.target) {
                  evt.target.blur();
                }
                ctrl.ngModelCtrl.$setViewValue(page);
                ctrl.ngModelCtrl.$render();
              }
            };
  
            $scope.getText = function (key) {
              return $scope[key + "Text"] || ctrl.config[key + "Text"];
            };
  
            $scope.noPrevious = function () {
              return $scope.page === 1;
            };
  
            $scope.noNext = function () {
              return $scope.page === $scope.totalPages;
            };
  
            ctrl.updatePage = function () {
              ctrl.setNumPages($scope.$parent, $scope.totalPages); // Readonly variable
  
              if ($scope.page > $scope.totalPages) {
                $scope.selectPage($scope.totalPages);
              } else {
                ctrl.ngModelCtrl.$render();
              }
            };
  
            $scope.$on("$destroy", function () {
              while (ctrl._watchers.length) {
                ctrl._watchers.shift()();
              }
            });
          }
        };
      }
    ]);
  
  angular
    .module("ui.bootstrap.pager", ["ui.bootstrap.paging", "ui.bootstrap.tabindex"])
  
    .controller("UibPagerController", [
      "$scope",
      "$attrs",
      "uibPaging",
      "uibPagerConfig",
      function ($scope, $attrs, uibPaging, uibPagerConfig) {
        $scope.align = angular.isDefined($attrs.align) ? $scope.$parent.$eval($attrs.align) : uibPagerConfig.align;
  
        uibPaging.create(this, $scope, $attrs);
      }
    ])
  
    .constant("uibPagerConfig", {
      itemsPerPage: 10,
      previousText: "Â« Previous",
      nextText: "Next Â»",
      align: true
    })
  
    .directive("uibPager", [
      "uibPagerConfig",
      function (uibPagerConfig) {
        return {
          scope: {
            totalItems: "=",
            previousText: "@",
            nextText: "@",
            ngDisabled: "="
          },
          require: ["uibPager", "?ngModel"],
          restrict: "A",
          controller: "UibPagerController",
          controllerAs: "pager",
          templateUrl: function (element, attrs) {
            return attrs.templateUrl || "uib/template/pager/pager.html";
          },
          link: function (scope, element, attrs, ctrls) {
            element.addClass("pager");
            var paginationCtrl = ctrls[0],
              ngModelCtrl = ctrls[1];
  
            if (!ngModelCtrl) {
              return; // do nothing if no ng-model
            }
  
            paginationCtrl.init(ngModelCtrl, uibPagerConfig);
          }
        };
      }
    ]);
  
  angular
    .module("ui.bootstrap.pagination", ["ui.bootstrap.paging", "ui.bootstrap.tabindex"])
    .controller("UibPaginationController", [
      "$scope",
      "$attrs",
      "$parse",
      "uibPaging",
      "uibPaginationConfig",
      function ($scope, $attrs, $parse, uibPaging, uibPaginationConfig) {
        var ctrl = this;
        // Setup configuration parameters
        var maxSize = angular.isDefined($attrs.maxSize)
            ? $scope.$parent.$eval($attrs.maxSize)
            : uibPaginationConfig.maxSize,
          rotate = angular.isDefined($attrs.rotate) ? $scope.$parent.$eval($attrs.rotate) : uibPaginationConfig.rotate,
          forceEllipses = angular.isDefined($attrs.forceEllipses)
            ? $scope.$parent.$eval($attrs.forceEllipses)
            : uibPaginationConfig.forceEllipses,
          boundaryLinkNumbers = angular.isDefined($attrs.boundaryLinkNumbers)
            ? $scope.$parent.$eval($attrs.boundaryLinkNumbers)
            : uibPaginationConfig.boundaryLinkNumbers,
          pageLabel = angular.isDefined($attrs.pageLabel)
            ? function (idx) {
                return $scope.$parent.$eval($attrs.pageLabel, { $page: idx });
              }
            : angular.identity;
        $scope.boundaryLinks = angular.isDefined($attrs.boundaryLinks)
          ? $scope.$parent.$eval($attrs.boundaryLinks)
          : uibPaginationConfig.boundaryLinks;
        $scope.directionLinks = angular.isDefined($attrs.directionLinks)
          ? $scope.$parent.$eval($attrs.directionLinks)
          : uibPaginationConfig.directionLinks;
        $attrs.$set("role", "menu");
  
        uibPaging.create(this, $scope, $attrs);
  
        if ($attrs.maxSize) {
          ctrl._watchers.push(
            $scope.$parent.$watch($parse($attrs.maxSize), function (value) {
              maxSize = parseInt(value, 10);
              ctrl.render();
            })
          );
        }
  
        // Create page object used in template
        function makePage(number, text, isActive) {
          return {
            number: number,
            text: text,
            active: isActive
          };
        }
  
        function getPages(currentPage, totalPages) {
          var pages = [];
  
          // Default page limits
          var startPage = 1,
            endPage = totalPages;
          var isMaxSized = angular.isDefined(maxSize) && maxSize < totalPages;
  
          // recompute if maxSize
          if (isMaxSized) {
            if (rotate) {
              // Current page is displayed in the middle of the visible ones
              startPage = Math.max(currentPage - Math.floor(maxSize / 2), 1);
              endPage = startPage + maxSize - 1;
  
              // Adjust if limit is exceeded
              if (endPage > totalPages) {
                endPage = totalPages;
                startPage = endPage - maxSize + 1;
              }
            } else {
              // Visible pages are paginated with maxSize
              startPage = (Math.ceil(currentPage / maxSize) - 1) * maxSize + 1;
  
              // Adjust last page if limit is exceeded
              endPage = Math.min(startPage + maxSize - 1, totalPages);
            }
          }
  
          // Add page number links
          for (var number = startPage; number <= endPage; number++) {
            var page = makePage(number, pageLabel(number), number === currentPage);
            pages.push(page);
          }
  
          // Add links to move between page sets
          if (isMaxSized && maxSize > 0 && (!rotate || forceEllipses || boundaryLinkNumbers)) {
            if (startPage > 1) {
              if (!boundaryLinkNumbers || startPage > 3) {
                //need ellipsis for all options unless range is too close to beginning
                var previousPageSet = makePage(startPage - 1, "...", false);
                pages.unshift(previousPageSet);
              }
              if (boundaryLinkNumbers) {
                if (startPage === 3) {
                  //need to replace ellipsis when the buttons would be sequential
                  var secondPageLink = makePage(2, "2", false);
                  pages.unshift(secondPageLink);
                }
                //add the first page
                var firstPageLink = makePage(1, "1", false);
                pages.unshift(firstPageLink);
              }
            }
  
            if (endPage < totalPages) {
              if (!boundaryLinkNumbers || endPage < totalPages - 2) {
                //need ellipsis for all options unless range is too close to end
                var nextPageSet = makePage(endPage + 1, "...", false);
                pages.push(nextPageSet);
              }
              if (boundaryLinkNumbers) {
                if (endPage === totalPages - 2) {
                  //need to replace ellipsis when the buttons would be sequential
                  var secondToLastPageLink = makePage(totalPages - 1, totalPages - 1, false);
                  pages.push(secondToLastPageLink);
                }
                //add the last page
                var lastPageLink = makePage(totalPages, totalPages, false);
                pages.push(lastPageLink);
              }
            }
          }
          return pages;
        }
  
        var originalRender = this.render;
        this.render = function () {
          originalRender();
          if ($scope.page > 0 && $scope.page <= $scope.totalPages) {
            $scope.pages = getPages($scope.page, $scope.totalPages);
          }
        };
      }
    ])
  
    .constant("uibPaginationConfig", {
      itemsPerPage: 10,
      boundaryLinks: false,
      boundaryLinkNumbers: false,
      directionLinks: true,
      firstText: "First",
      previousText: "Previous",
      nextText: "Next",
      lastText: "Last",
      rotate: true,
      forceEllipses: false
    })
  
    .directive("uibPagination", [
      "$parse",
      "uibPaginationConfig",
      function ($parse, uibPaginationConfig) {
        return {
          scope: {
            totalItems: "=",
            firstText: "@",
            previousText: "@",
            nextText: "@",
            lastText: "@",
            ngDisabled: "="
          },
          require: ["uibPagination", "?ngModel"],
          restrict: "A",
          controller: "UibPaginationController",
          controllerAs: "pagination",
          templateUrl: function (element, attrs) {
            return attrs.templateUrl || "uib/template/pagination/pagination.html";
          },
          link: function (scope, element, attrs, ctrls) {
            element.addClass("pagination");
            var paginationCtrl = ctrls[0],
              ngModelCtrl = ctrls[1];
  
            if (!ngModelCtrl) {
              return; // do nothing if no ng-model
            }
  
            paginationCtrl.init(ngModelCtrl, uibPaginationConfig);
          }
        };
      }
    ]);
  
  /**
   * The following features are still outstanding: animation as a
   * function, placement as a function, inside, support for more triggers than
   * just mouse enter/leave, html tooltips, and selector delegation.
   */
  angular
    .module("ui.bootstrap.tooltip", ["ui.bootstrap.position", "ui.bootstrap.stackedMap"])
  
    /**
     * The $tooltip service creates tooltip- and popover-like directives as well as
     * houses global options for them.
     */
    .provider("$uibTooltip", function () {
      // The default options tooltip and popover.
      var defaultOptions = {
        placement: "top",
        placementClassPrefix: "",
        animation: true,
        popupDelay: 0,
        popupCloseDelay: 0,
        useContentExp: false
      };
  
      // Default hide triggers for each show trigger
      var triggerMap = {
        mouseenter: "mouseleave",
        click: "click",
        outsideClick: "outsideClick",
        focus: "blur",
        none: ""
      };
  
      // The options specified to the provider globally.
      var globalOptions = {};
  
      /**
       * `options({})` allows global configuration of all tooltips in the
       * application.
       *
       *   var app = angular.module( 'App', ['ui.bootstrap.tooltip'], function( $tooltipProvider ) {
       *     // place tooltips left instead of top by default
       *     $tooltipProvider.options( { placement: 'left' } );
       *   });
       */
      this.options = function (value) {
        angular.extend(globalOptions, value);
      };
  
      /**
       * This allows you to extend the set of trigger mappings available. E.g.:
       *
       *   $tooltipProvider.setTriggers( { 'openTrigger': 'closeTrigger' } );
       */
      this.setTriggers = function setTriggers(triggers) {
        angular.extend(triggerMap, triggers);
      };
  
      /**
       * This is a helper function for translating camel-case to snake_case.
       */
      function snake_case(name) {
        var regexp = /[A-Z]/g;
        var separator = "-";
        return name.replace(regexp, function (letter, pos) {
          return (pos ? separator : "") + letter.toLowerCase();
        });
      }
  
      /**
       * Returns the actual instance of the $tooltip service.
       * TODO support multiple triggers
       */
      this.$get = [
        "$window",
        "$compile",
        "$timeout",
        "$document",
        "$uibPosition",
        "$interpolate",
        "$rootScope",
        "$parse",
        "$$stackedMap",
        function ($window, $compile, $timeout, $document, $position, $interpolate, $rootScope, $parse, $$stackedMap) {
          var openedTooltips = $$stackedMap.createNew();
          $document.on("keyup", keypressListener);
  
          $rootScope.$on("$destroy", function () {
            $document.off("keyup", keypressListener);
          });
  
          function keypressListener(e) {
            if (e.which === 27) {
              var last = openedTooltips.top();
              if (last) {
                last.value.close();
                last = null;
              }
            }
          }
  
          return function $tooltip(ttType, prefix, defaultTriggerShow, options) {
            options = angular.extend({}, defaultOptions, globalOptions, options);
  
            /**
             * Returns an object of show and hide triggers.
             *
             * If a trigger is supplied,
             * it is used to show the tooltip; otherwise, it will use the `trigger`
             * option passed to the `$tooltipProvider.options` method; else it will
             * default to the trigger supplied to this directive factory.
             *
             * The hide trigger is based on the show trigger. If the `trigger` option
             * was passed to the `$tooltipProvider.options` method, it will use the
             * mapped trigger from `triggerMap` or the passed trigger if the map is
             * undefined; otherwise, it uses the `triggerMap` value of the show
             * trigger; else it will just use the show trigger.
             */
            function getTriggers(trigger) {
              var show = (trigger || options.trigger || defaultTriggerShow).split(" ");
              var hide = show.map(function (trigger) {
                return triggerMap[trigger] || trigger;
              });
              return {
                show: show,
                hide: hide
              };
            }
  
            var directiveName = snake_case(ttType);
  
            var startSym = $interpolate.startSymbol();
            var endSym = $interpolate.endSymbol();
            var template =
              "<div " +
              directiveName +
              "-popup " +
              'uib-title="' +
              startSym +
              "title" +
              endSym +
              '" ' +
              (options.useContentExp
                ? 'content-exp="contentExp()" '
                : 'content="' + startSym + "content" + endSym + '" ') +
              'origin-scope="origScope" ' +
              'class="uib-position-measure ' +
              prefix +
              '" ' +
              'tooltip-animation-class="fade"' +
              "uib-tooltip-classes " +
              'ng-class="{ in: isOpen }" ' +
              ">" +
              "</div>";
  
            return {
              compile: function (tElem, tAttrs) {
                var tooltipLinker = $compile(template);
  
                return function link(scope, element, attrs, tooltipCtrl) {
                  var tooltip;
                  var tooltipLinkedScope;
                  var transitionTimeout;
                  var showTimeout;
                  var hideTimeout;
                  var positionTimeout;
                  var adjustmentTimeout;
                  var appendToBody = angular.isDefined(options.appendToBody) ? options.appendToBody : false;
                  var triggers = getTriggers(undefined);
                  var hasEnableExp = angular.isDefined(attrs[prefix + "Enable"]);
                  var ttScope = scope.$new(true);
                  var repositionScheduled = false;
                  var isOpenParse = angular.isDefined(attrs[prefix + "IsOpen"])
                    ? $parse(attrs[prefix + "IsOpen"])
                    : false;
                  var contentParse = options.useContentExp ? $parse(attrs[ttType]) : false;
                  var observers = [];
                  var lastPlacement;
  
                  var positionTooltip = function () {
                    // check if tooltip exists and is not empty
                    if (!tooltip || !tooltip.html()) {
                      return;
                    }
  
                    if (!positionTimeout) {
                      positionTimeout = $timeout(
                        function () {
                          var ttPosition = $position.positionElements(element, tooltip, ttScope.placement, appendToBody);
                          var initialHeight = angular.isDefined(tooltip.offsetHeight)
                            ? tooltip.offsetHeight
                            : tooltip.prop("offsetHeight");
                          var elementPos = appendToBody ? $position.offset(element) : $position.position(element);
                          tooltip.css({ top: ttPosition.top + "px", left: ttPosition.left + "px" });
                          var placementClasses = ttPosition.placement.split("-");
  
                          if (!tooltip.hasClass(placementClasses[0])) {
                            tooltip.removeClass(lastPlacement.split("-")[0]);
                            tooltip.addClass(placementClasses[0]);
                          }
  
                          if (!tooltip.hasClass(options.placementClassPrefix + ttPosition.placement)) {
                            tooltip.removeClass(options.placementClassPrefix + lastPlacement);
                            tooltip.addClass(options.placementClassPrefix + ttPosition.placement);
                          }
  
                          adjustmentTimeout = $timeout(
                            function () {
                              var currentHeight = angular.isDefined(tooltip.offsetHeight)
                                ? tooltip.offsetHeight
                                : tooltip.prop("offsetHeight");
                              var adjustment = $position.adjustTop(
                                placementClasses,
                                elementPos,
                                initialHeight,
                                currentHeight
                              );
                              if (adjustment) {
                                tooltip.css(adjustment);
                              }
                              adjustmentTimeout = null;
                            },
                            0,
                            false
                          );
  
                          // first time through tt element will have the
                          // uib-position-measure class or if the placement
                          // has changed we need to position the arrow.
                          if (tooltip.hasClass("uib-position-measure")) {
                            $position.positionArrow(tooltip, ttPosition.placement);
                            tooltip.removeClass("uib-position-measure");
                          } else if (lastPlacement !== ttPosition.placement) {
                            $position.positionArrow(tooltip, ttPosition.placement);
                          }
                          lastPlacement = ttPosition.placement;
  
                          positionTimeout = null;
                        },
                        0,
                        false
                      );
                    }
                  };
  
                  // Set up the correct scope to allow transclusion later
                  ttScope.origScope = scope;
  
                  // By default, the tooltip is not open.
                  // TODO add ability to start tooltip opened
                  ttScope.isOpen = false;
  
                  function toggleTooltipBind() {
                    if (!ttScope.isOpen) {
                      showTooltipBind();
                    } else {
                      hideTooltipBind();
                    }
                  }
  
                  // Show the tooltip with delay if specified, otherwise show it immediately
                  function showTooltipBind() {
                    if (hasEnableExp && !scope.$eval(attrs[prefix + "Enable"])) {
                      return;
                    }
  
                    cancelHide();
                    prepareTooltip();
  
                    if (ttScope.popupDelay) {
                      // Do nothing if the tooltip was already scheduled to pop-up.
                      // This happens if show is triggered multiple times before any hide is triggered.
                      if (!showTimeout) {
                        showTimeout = $timeout(show, ttScope.popupDelay, false);
                      }
                    } else {
                      show();
                    }
                  }
  
                  function hideTooltipBind() {
                    cancelShow();
  
                    if (ttScope.popupCloseDelay) {
                      if (!hideTimeout) {
                        hideTimeout = $timeout(hide, ttScope.popupCloseDelay, false);
                      }
                    } else {
                      hide();
                    }
                  }
  
                  // Show the tooltip popup element.
                  function show() {
                    cancelShow();
                    cancelHide();
  
                    // Don't show empty tooltips.
                    if (!ttScope.content) {
                      return angular.noop;
                    }
  
                    createTooltip();
  
                    // And show the tooltip.
                    ttScope.$evalAsync(function () {
                      ttScope.isOpen = true;
                      assignIsOpen(true);
                      positionTooltip();
                    });
                  }
  
                  function cancelShow() {
                    if (showTimeout) {
                      $timeout.cancel(showTimeout);
                      showTimeout = null;
                    }
  
                    if (positionTimeout) {
                      $timeout.cancel(positionTimeout);
                      positionTimeout = null;
                    }
                  }
  
                  // Hide the tooltip popup element.
                  function hide() {
                    if (!ttScope) {
                      return;
                    }
  
                    // First things first: we don't show it anymore.
                    ttScope.$evalAsync(function () {
                      if (ttScope) {
                        ttScope.isOpen = false;
                        assignIsOpen(false);
                        // And now we remove it from the DOM. However, if we have animation, we
                        // need to wait for it to expire beforehand.
                        // FIXME: this is a placeholder for a port of the transitions library.
                        // The fade transition in TWBS is 150ms.
                        if (ttScope.animation) {
                          if (!transitionTimeout) {
                            transitionTimeout = $timeout(removeTooltip, 150, false);
                          }
                        } else {
                          removeTooltip();
                        }
                      }
                    });
                  }
  
                  function cancelHide() {
                    if (hideTimeout) {
                      $timeout.cancel(hideTimeout);
                      hideTimeout = null;
                    }
  
                    if (transitionTimeout) {
                      $timeout.cancel(transitionTimeout);
                      transitionTimeout = null;
                    }
                  }
  
                  function createTooltip() {
                    // There can only be one tooltip element per directive shown at once.
                    if (tooltip) {
                      return;
                    }
  
                    tooltipLinkedScope = ttScope.$new();
                    tooltip = tooltipLinker(tooltipLinkedScope, function (tooltip) {
                      if (appendToBody) {
                        $document.find("body").append(tooltip);
                      } else {
                        element.after(tooltip);
                      }
                    });
  
                    openedTooltips.add(ttScope, {
                      close: hide
                    });
  
                    prepObservers();
                  }
  
                  function removeTooltip() {
                    cancelShow();
                    cancelHide();
                    unregisterObservers();
  
                    if (tooltip) {
                      tooltip.remove();
  
                      tooltip = null;
                      if (adjustmentTimeout) {
                        $timeout.cancel(adjustmentTimeout);
                      }
                    }
  
                    openedTooltips.remove(ttScope);
  
                    if (tooltipLinkedScope) {
                      tooltipLinkedScope.$destroy();
                      tooltipLinkedScope = null;
                    }
                  }
  
                  /**
                   * Set the initial scope values. Once
                   * the tooltip is created, the observers
                   * will be added to keep things in sync.
                   */
                  function prepareTooltip() {
                    ttScope.title = attrs[prefix + "Title"];
                    if (contentParse) {
                      ttScope.content = contentParse(scope);
                    } else {
                      ttScope.content = attrs[ttType];
                    }
  
                    ttScope.popupClass = attrs[prefix + "Class"];
                    ttScope.placement = angular.isDefined(attrs[prefix + "Placement"])
                      ? attrs[prefix + "Placement"]
                      : options.placement;
                    var placement = $position.parsePlacement(ttScope.placement);
                    lastPlacement = placement[1] ? placement[0] + "-" + placement[1] : placement[0];
  
                    var delay = parseInt(attrs[prefix + "PopupDelay"], 10);
                    var closeDelay = parseInt(attrs[prefix + "PopupCloseDelay"], 10);
                    ttScope.popupDelay = !isNaN(delay) ? delay : options.popupDelay;
                    ttScope.popupCloseDelay = !isNaN(closeDelay) ? closeDelay : options.popupCloseDelay;
                  }
  
                  function assignIsOpen(isOpen) {
                    if (isOpenParse && angular.isFunction(isOpenParse.assign)) {
                      isOpenParse.assign(scope, isOpen);
                    }
                  }
  
                  ttScope.contentExp = function () {
                    return ttScope.content;
                  };
  
                  /**
                   * Observe the relevant attributes.
                   */
                  attrs.$observe("disabled", function (val) {
                    if (val) {
                      cancelShow();
                    }
  
                    if (val && ttScope.isOpen) {
                      hide();
                    }
                  });
  
                  if (isOpenParse) {
                    scope.$watch(isOpenParse, function (val) {
                      if (ttScope && !val === ttScope.isOpen) {
                        toggleTooltipBind();
                      }
                    });
                  }
  
                  function prepObservers() {
                    observers.length = 0;
  
                    if (contentParse) {
                      observers.push(
                        scope.$watch(contentParse, function (val) {
                          ttScope.content = val;
                          if (!val && ttScope.isOpen) {
                            hide();
                          }
                        })
                      );
  
                      observers.push(
                        tooltipLinkedScope.$watch(function () {
                          if (!repositionScheduled) {
                            repositionScheduled = true;
                            tooltipLinkedScope.$$postDigest(function () {
                              repositionScheduled = false;
                              if (ttScope && ttScope.isOpen) {
                                positionTooltip();
                              }
                            });
                          }
                        })
                      );
                    } else {
                      observers.push(
                        attrs.$observe(ttType, function (val) {
                          ttScope.content = val;
                          if (!val && ttScope.isOpen) {
                            hide();
                          } else {
                            positionTooltip();
                          }
                        })
                      );
                    }
  
                    observers.push(
                      attrs.$observe(prefix + "Title", function (val) {
                        ttScope.title = val;
                        if (ttScope.isOpen) {
                          positionTooltip();
                        }
                      })
                    );
  
                    observers.push(
                      attrs.$observe(prefix + "Placement", function (val) {
                        ttScope.placement = val ? val : options.placement;
                        if (ttScope.isOpen) {
                          positionTooltip();
                        }
                      })
                    );
                  }
  
                  function unregisterObservers() {
                    if (observers.length) {
                      angular.forEach(observers, function (observer) {
                        observer();
                      });
                      observers.length = 0;
                    }
                  }
  
                  // hide tooltips/popovers for outsideClick trigger
                  function bodyHideTooltipBind(e) {
                    if (!ttScope || !ttScope.isOpen || !tooltip) {
                      return;
                    }
                    // make sure the tooltip/popover link or tool tooltip/popover itself were not clicked
                    if (!element[0].contains(e.target) && !tooltip[0].contains(e.target)) {
                      hideTooltipBind();
                    }
                  }
  
                  // KeyboardEvent handler to hide the tooltip on Escape key press
                  function hideOnEscapeKey(e) {
                    if (e.which === 27) {
                      hideTooltipBind();
                    }
                  }
  
                  var unregisterTriggers = function () {
                    triggers.show.forEach(function (trigger) {
                      if (trigger === "outsideClick") {
                        element.off("click", toggleTooltipBind);
                      } else {
                        element.off(trigger, showTooltipBind);
                        element.off(trigger, toggleTooltipBind);
                      }
                      element.off("keypress", hideOnEscapeKey);
                    });
                    triggers.hide.forEach(function (trigger) {
                      if (trigger === "outsideClick") {
                        $document.off("click", bodyHideTooltipBind);
                      } else {
                        element.off(trigger, hideTooltipBind);
                      }
                    });
                  };
  
                  function prepTriggers() {
                    var showTriggers = [],
                      hideTriggers = [];
                    var val = scope.$eval(attrs[prefix + "Trigger"]);
                    unregisterTriggers();
  
                    if (angular.isObject(val)) {
                      Object.keys(val).forEach(function (key) {
                        showTriggers.push(key);
                        hideTriggers.push(val[key]);
                      });
                      triggers = {
                        show: showTriggers,
                        hide: hideTriggers
                      };
                    } else {
                      triggers = getTriggers(val);
                    }
  
                    if (triggers.show !== "none") {
                      triggers.show.forEach(function (trigger, idx) {
                        if (trigger === "outsideClick") {
                          element.on("click", toggleTooltipBind);
                          $document.on("click", bodyHideTooltipBind);
                        } else if (trigger === triggers.hide[idx]) {
                          element.on(trigger, toggleTooltipBind);
                        } else if (trigger) {
                          element.on(trigger, showTooltipBind);
                          element.on(triggers.hide[idx], hideTooltipBind);
                        }
                        element.on("keypress", hideOnEscapeKey);
                      });
                    }
                  }
  
                  prepTriggers();
  
                  var animation = scope.$eval(attrs[prefix + "Animation"]);
                  ttScope.animation = angular.isDefined(animation) ? !!animation : options.animation;
  
                  var appendToBodyVal;
                  var appendKey = prefix + "AppendToBody";
                  if (appendKey in attrs && attrs[appendKey] === undefined) {
                    appendToBodyVal = true;
                  } else {
                    appendToBodyVal = scope.$eval(attrs[appendKey]);
                  }
  
                  appendToBody = angular.isDefined(appendToBodyVal) ? appendToBodyVal : appendToBody;
  
                  // Make sure tooltip is destroyed and removed.
                  scope.$on("$destroy", function onDestroyTooltip() {
                    unregisterTriggers();
                    removeTooltip();
                    ttScope = null;
                  });
                };
              }
            };
          };
        }
      ];
    })
  
    // This is mostly ngInclude code but with a custom scope
    .directive("uibTooltipTemplateTransclude", [
      "$animate",
      "$sce",
      "$compile",
      "$templateRequest",
      function ($animate, $sce, $compile, $templateRequest) {
        return {
          link: function (scope, elem, attrs) {
            var origScope = scope.$eval(attrs.tooltipTemplateTranscludeScope);
  
            var changeCounter = 0,
              currentScope,
              previousElement,
              currentElement;
  
            var cleanupLastIncludeContent = function () {
              if (previousElement) {
                previousElement.remove();
                previousElement = null;
              }
  
              if (currentScope) {
                currentScope.$destroy();
                currentScope = null;
              }
  
              if (currentElement) {
                $animate.leave(currentElement).then(function () {
                  previousElement = null;
                });
                previousElement = currentElement;
                currentElement = null;
              }
            };
  
            scope.$watch($sce.parseAsResourceUrl(attrs.uibTooltipTemplateTransclude), function (src) {
              var thisChangeId = ++changeCounter;
  
              if (src) {
                //set the 2nd param to true to ignore the template request error so that the inner
                //contents and scope can be cleaned up.
                $templateRequest(src, true).then(
                  function (response) {
                    if (thisChangeId !== changeCounter) {
                      return;
                    }
                    var newScope = origScope.$new();
                    var template = response;
  
                    var clone = $compile(template)(newScope, function (clone) {
                      cleanupLastIncludeContent();
                      $animate.enter(clone, elem);
                    });
  
                    currentScope = newScope;
                    currentElement = clone;
  
                    currentScope.$emit("$includeContentLoaded", src);
                  },
                  function () {
                    if (thisChangeId === changeCounter) {
                      cleanupLastIncludeContent();
                      scope.$emit("$includeContentError", src);
                    }
                  }
                );
                scope.$emit("$includeContentRequested", src);
              } else {
                cleanupLastIncludeContent();
              }
            });
  
            scope.$on("$destroy", cleanupLastIncludeContent);
          }
        };
      }
    ])
  
    /**
     * Note that it's intentional that these classes are *not* applied through $animate.
     * They must not be animated as they're expected to be present on the tooltip on
     * initialization.
     */
    .directive("uibTooltipClasses", [
      "$uibPosition",
      function ($uibPosition) {
        return {
          restrict: "A",
          link: function (scope, element, attrs) {
            // need to set the primary position so the
            // arrow has space during position measure.
            // tooltip.positionTooltip()
            if (scope.placement) {
              // // There are no top-left etc... classes
              // // in TWBS, so we need the primary position.
              var position = $uibPosition.parsePlacement(scope.placement);
              element.addClass(position[0]);
            }
  
            if (scope.popupClass) {
              element.addClass(scope.popupClass);
            }
  
            if (scope.animation) {
              element.addClass(attrs.tooltipAnimationClass);
            }
          }
        };
      }
    ])
  
    .directive("uibTooltipPopup", function () {
      return {
        restrict: "A",
        scope: { content: "@" },
        templateUrl: "uib/template/tooltip/tooltip-popup.html"
      };
    })
  
    .directive("uibTooltip", [
      "$uibTooltip",
      function ($uibTooltip) {
        return $uibTooltip("uibTooltip", "tooltip", "mouseenter");
      }
    ])
  
    .directive("uibTooltipTemplatePopup", function () {
      return {
        restrict: "A",
        scope: { contentExp: "&", originScope: "&" },
        templateUrl: "uib/template/tooltip/tooltip-template-popup.html"
      };
    })
  
    .directive("uibTooltipTemplate", [
      "$uibTooltip",
      function ($uibTooltip) {
        return $uibTooltip("uibTooltipTemplate", "tooltip", "mouseenter", {
          useContentExp: true
        });
      }
    ])
  
    .directive("uibTooltipHtmlPopup", function () {
      return {
        restrict: "A",
        scope: { contentExp: "&" },
        templateUrl: "uib/template/tooltip/tooltip-html-popup.html"
      };
    })
  
    .directive("uibTooltipHtml", [
      "$uibTooltip",
      function ($uibTooltip) {
        return $uibTooltip("uibTooltipHtml", "tooltip", "mouseenter", {
          useContentExp: true
        });
      }
    ]);
  
  /**
   * The following features are still outstanding: popup delay, animation as a
   * function, placement as a function, inside, support for more triggers than
   * just mouse enter/leave, and selector delegatation.
   */
  angular
    .module("ui.bootstrap.popover", ["ui.bootstrap.tooltip"])
  
    .directive("uibPopoverTemplatePopup", function () {
      return {
        restrict: "A",
        scope: { uibTitle: "@", contentExp: "&", originScope: "&" },
        templateUrl: "uib/template/popover/popover-template.html"
      };
    })
  
    .directive("uibPopoverTemplate", [
      "$uibTooltip",
      function ($uibTooltip) {
        return $uibTooltip("uibPopoverTemplate", "popover", "click", {
          useContentExp: true
        });
      }
    ])
  
    .directive("uibPopoverHtmlPopup", function () {
      return {
        restrict: "A",
        scope: { contentExp: "&", uibTitle: "@" },
        templateUrl: "uib/template/popover/popover-html.html"
      };
    })
  
    .directive("uibPopoverHtml", [
      "$uibTooltip",
      function ($uibTooltip) {
        return $uibTooltip("uibPopoverHtml", "popover", "click", {
          useContentExp: true
        });
      }
    ])
  
    .directive("uibPopoverPopup", function () {
      return {
        restrict: "A",
        scope: { uibTitle: "@", content: "@" },
        templateUrl: "uib/template/popover/popover.html"
      };
    })
  
    .directive("uibPopover", [
      "$uibTooltip",
      function ($uibTooltip) {
        return $uibTooltip("uibPopover", "popover", "click");
      }
    ]);
  
  angular
    .module("ui.bootstrap.progressbar", [])
  
    .constant("uibProgressConfig", {
      animate: true,
      max: 100
    })
  
    .controller("UibProgressController", [
      "$scope",
      "$attrs",
      "uibProgressConfig",
      function ($scope, $attrs, progressConfig) {
        var self = this,
          animate = angular.isDefined($attrs.animate) ? $scope.$parent.$eval($attrs.animate) : progressConfig.animate;
  
        this.bars = [];
        $scope.max = getMaxOrDefault();
  
        this.addBar = function (bar, element, attrs) {
          if (!animate) {
            element.css({ transition: "none" });
          }
  
          this.bars.push(bar);
  
          bar.max = getMaxOrDefault();
          bar.title = attrs && angular.isDefined(attrs.title) ? attrs.title : "progressbar";
  
          bar.$watch("value", function (value) {
            bar.recalculatePercentage();
          });
  
          bar.recalculatePercentage = function () {
            var totalPercentage = self.bars.reduce(function (total, bar) {
              bar.percent = +((100 * bar.value) / bar.max).toFixed(2);
              return total + bar.percent;
            }, 0);
  
            if (totalPercentage > 100) {
              bar.percent -= totalPercentage - 100;
            }
          };
  
          bar.$on("$destroy", function () {
            element = null;
            self.removeBar(bar);
          });
        };
  
        this.removeBar = function (bar) {
          this.bars.splice(this.bars.indexOf(bar), 1);
          this.bars.forEach(function (bar) {
            bar.recalculatePercentage();
          });
        };
  
        //$attrs.$observe('maxParam', function(maxParam) {
        $scope.$watch("maxParam", function (maxParam) {
          self.bars.forEach(function (bar) {
            bar.max = getMaxOrDefault();
            bar.recalculatePercentage();
          });
        });
  
        function getMaxOrDefault() {
          return angular.isDefined($scope.maxParam) ? $scope.maxParam : progressConfig.max;
        }
      }
    ])
  
    .directive("uibProgress", function () {
      return {
        replace: true,
        transclude: true,
        controller: "UibProgressController",
        require: "uibProgress",
        scope: {
          maxParam: "=?max"
        },
        templateUrl: "uib/template/progressbar/progress.html"
      };
    })
  
    .directive("uibBar", function () {
      return {
        replace: true,
        transclude: true,
        require: "^uibProgress",
        scope: {
          value: "=",
          type: "@"
        },
        templateUrl: "uib/template/progressbar/bar.html",
        link: function (scope, element, attrs, progressCtrl) {
          progressCtrl.addBar(scope, element, attrs);
        }
      };
    })
  
    .directive("uibProgressbar", function () {
      return {
        replace: true,
        transclude: true,
        controller: "UibProgressController",
        scope: {
          value: "=",
          maxParam: "=?max",
          type: "@"
        },
        templateUrl: "uib/template/progressbar/progressbar.html",
        link: function (scope, element, attrs, progressCtrl) {
          progressCtrl.addBar(scope, angular.element(element.children()[0]), { title: attrs.title });
        }
      };
    });
  
  angular
    .module("ui.bootstrap.rating", [])
  
    .constant("uibRatingConfig", {
      max: 5,
      stateOn: null,
      stateOff: null,
      enableReset: true,
      titles: ["one", "two", "three", "four", "five"]
    })
  
    .controller("UibRatingController", [
      "$scope",
      "$attrs",
      "uibRatingConfig",
      function ($scope, $attrs, ratingConfig) {
        var ngModelCtrl = { $setViewValue: angular.noop },
          self = this;
  
        this.init = function (ngModelCtrl_) {
          ngModelCtrl = ngModelCtrl_;
          ngModelCtrl.$render = this.render;
  
          ngModelCtrl.$formatters.push(function (value) {
            if (angular.isNumber(value) && value << 0 !== value) {
              value = Math.round(value);
            }
  
            return value;
          });
  
          this.stateOn = angular.isDefined($attrs.stateOn) ? $scope.$parent.$eval($attrs.stateOn) : ratingConfig.stateOn;
          this.stateOff = angular.isDefined($attrs.stateOff)
            ? $scope.$parent.$eval($attrs.stateOff)
            : ratingConfig.stateOff;
          this.enableReset = angular.isDefined($attrs.enableReset)
            ? $scope.$parent.$eval($attrs.enableReset)
            : ratingConfig.enableReset;
          var tmpTitles = angular.isDefined($attrs.titles) ? $scope.$parent.$eval($attrs.titles) : ratingConfig.titles;
          this.titles = angular.isArray(tmpTitles) && tmpTitles.length > 0 ? tmpTitles : ratingConfig.titles;
  
          var ratingStates = angular.isDefined($attrs.ratingStates)
            ? $scope.$parent.$eval($attrs.ratingStates)
            : new Array(angular.isDefined($attrs.max) ? $scope.$parent.$eval($attrs.max) : ratingConfig.max);
          $scope.range = this.buildTemplateObjects(ratingStates);
        };
  
        this.buildTemplateObjects = function (states) {
          for (var i = 0, n = states.length; i < n; i++) {
            states[i] = angular.extend(
              { index: i },
              { stateOn: this.stateOn, stateOff: this.stateOff, title: this.getTitle(i) },
              states[i]
            );
          }
          return states;
        };
  
        this.getTitle = function (index) {
          if (index >= this.titles.length) {
            return index + 1;
          }
  
          return this.titles[index];
        };
  
        $scope.rate = function (value) {
          if (!$scope.readonly && value >= 0 && value <= $scope.range.length) {
            var newViewValue = self.enableReset && ngModelCtrl.$viewValue === value ? 0 : value;
            ngModelCtrl.$setViewValue(newViewValue);
            ngModelCtrl.$render();
          }
        };
  
        $scope.enter = function (value) {
          if (!$scope.readonly) {
            $scope.value = value;
          }
          $scope.onHover({ value: value });
        };
  
        $scope.reset = function () {
          $scope.value = ngModelCtrl.$viewValue;
          $scope.onLeave();
        };
  
        $scope.onKeydown = function (evt) {
          if (/(37|38|39|40)/.test(evt.which)) {
            evt.preventDefault();
            evt.stopPropagation();
            $scope.rate($scope.value + (evt.which === 38 || evt.which === 39 ? 1 : -1));
          }
        };
  
        this.render = function () {
          $scope.value = ngModelCtrl.$viewValue;
          $scope.title = self.getTitle($scope.value - 1);
        };
      }
    ])
  
    .directive("uibRating", function () {
      return {
        require: ["uibRating", "ngModel"],
        restrict: "A",
        scope: {
          readonly: "=?readOnly",
          onHover: "&",
          onLeave: "&"
        },
        controller: "UibRatingController",
        templateUrl: "uib/template/rating/rating.html",
        link: function (scope, element, attrs, ctrls) {
          var ratingCtrl = ctrls[0],
            ngModelCtrl = ctrls[1];
          ratingCtrl.init(ngModelCtrl);
        }
      };
    });
  
  angular
    .module("ui.bootstrap.tabs", [])
  
    .controller("UibTabsetController", [
      "$scope",
      function ($scope) {
        var ctrl = this,
          oldIndex;
        ctrl.tabs = [];
  
        ctrl.select = function (index, evt) {
          if (!destroyed) {
            var previousIndex = findTabIndex(oldIndex);
            var previousSelected = ctrl.tabs[previousIndex];
            if (previousSelected) {
              previousSelected.tab.onDeselect({
                $event: evt,
                $selectedIndex: index
              });
              if (evt && evt.isDefaultPrevented()) {
                return;
              }
              previousSelected.tab.active = false;
            }
  
            var selected = ctrl.tabs[index];
            if (selected) {
              selected.tab.onSelect({
                $event: evt
              });
              selected.tab.active = true;
              ctrl.active = selected.index;
              oldIndex = selected.index;
            } else if (!selected && angular.isDefined(oldIndex)) {
              ctrl.active = null;
              oldIndex = null;
            }
          }
        };
  
        ctrl.addTab = function addTab(tab) {
          ctrl.tabs.push({
            tab: tab,
            index: tab.index
          });
          ctrl.tabs.sort(function (t1, t2) {
            if (t1.index > t2.index) {
              return 1;
            }
  
            if (t1.index < t2.index) {
              return -1;
            }
  
            return 0;
          });
  
          if (tab.index === ctrl.active || (!angular.isDefined(ctrl.active) && ctrl.tabs.length === 1)) {
            var newActiveIndex = findTabIndex(tab.index);
            ctrl.select(newActiveIndex);
          }
        };
  
        ctrl.removeTab = function removeTab(tab) {
          var index;
          for (var i = 0; i < ctrl.tabs.length; i++) {
            if (ctrl.tabs[i].tab === tab) {
              index = i;
              break;
            }
          }
  
          if (ctrl.tabs[index].index === ctrl.active) {
            var newActiveTabIndex = index === ctrl.tabs.length - 1 ? index - 1 : index + (1 % ctrl.tabs.length);
            ctrl.select(newActiveTabIndex);
          }
  
          ctrl.tabs.splice(index, 1);
        };
  
        $scope.$watch("tabset.active", function (val) {
          if (angular.isDefined(val) && val !== oldIndex) {
            ctrl.select(findTabIndex(val));
          }
        });
  
        var destroyed;
        $scope.$on("$destroy", function () {
          destroyed = true;
        });
  
        function findTabIndex(index) {
          for (var i = 0; i < ctrl.tabs.length; i++) {
            if (ctrl.tabs[i].index === index) {
              return i;
            }
          }
        }
      }
    ])
  
    .directive("uibTabset", function () {
      return {
        transclude: true,
        replace: true,
        scope: {},
        bindToController: {
          active: "=?",
          type: "@"
        },
        controller: "UibTabsetController",
        controllerAs: "tabset",
        templateUrl: function (element, attrs) {
          return attrs.templateUrl || "uib/template/tabs/tabset.html";
        },
        link: function (scope, element, attrs) {
          scope.vertical = angular.isDefined(attrs.vertical) ? scope.$parent.$eval(attrs.vertical) : false;
          scope.justified = angular.isDefined(attrs.justified) ? scope.$parent.$eval(attrs.justified) : false;
        }
      };
    })
  
    .directive("uibTab", [
      "$parse",
      function ($parse) {
        return {
          require: "^uibTabset",
          replace: true,
          templateUrl: function (element, attrs) {
            return attrs.templateUrl || "uib/template/tabs/tab.html";
          },
          transclude: true,
          scope: {
            heading: "@",
            index: "=?",
            classes: "@?",
            onSelect: "&select", //This callback is called in contentHeadingTransclude
            //once it inserts the tab's content into the dom
            onDeselect: "&deselect"
          },
          controller: function () {
            //Empty controller so other directives can require being 'under' a tab
          },
          controllerAs: "tab",
          link: function (scope, elm, attrs, tabsetCtrl, transclude) {
            scope.disabled = false;
            if (attrs.disable) {
              scope.$parent.$watch($parse(attrs.disable), function (value) {
                scope.disabled = !!value;
              });
            }
  
            if (angular.isUndefined(attrs.index)) {
              if (tabsetCtrl.tabs && tabsetCtrl.tabs.length) {
                scope.index =
                  Math.max.apply(
                    null,
                    tabsetCtrl.tabs.map(function (t) {
                      return t.index;
                    })
                  ) + 1;
              } else {
                scope.index = 0;
              }
            }
  
            if (angular.isUndefined(attrs.classes)) {
              scope.classes = "";
            }
  
            scope.select = function (evt) {
              if (!scope.disabled) {
                var index;
                for (var i = 0; i < tabsetCtrl.tabs.length; i++) {
                  if (tabsetCtrl.tabs[i].tab === scope) {
                    index = i;
                    break;
                  }
                }
  
                tabsetCtrl.select(index, evt);
              }
            };
  
            tabsetCtrl.addTab(scope);
            scope.$on("$destroy", function () {
              tabsetCtrl.removeTab(scope);
            });
  
            //We need to transclude later, once the content container is ready.
            //when this link happens, we're inside a tab heading.
            scope.$transcludeFn = transclude;
          }
        };
      }
    ])
  
    .directive("uibTabHeadingTransclude", function () {
      return {
        restrict: "A",
        require: "^uibTab",
        link: function (scope, elm) {
          scope.$watch("headingElement", function updateHeadingElement(heading) {
            if (heading) {
              elm.html("");
              elm.append(heading);
            }
          });
        }
      };
    })
  
    .directive("uibTabContentTransclude", function () {
      return {
        restrict: "A",
        require: "^uibTabset",
        link: function (scope, elm, attrs) {
          var tab = scope.$eval(attrs.uibTabContentTransclude).tab;
  
          //Now our tab is ready to be transcluded: both the tab heading area
          //and the tab content area are loaded.  Transclude 'em both.
          tab.$transcludeFn(tab.$parent, function (contents) {
            angular.forEach(contents, function (node) {
              if (isTabHeading(node)) {
                //Let tabHeadingTransclude know.
                tab.headingElement = node;
              } else {
                elm.append(node);
              }
            });
          });
        }
      };
  
      function isTabHeading(node) {
        return (
          node.tagName &&
          (node.hasAttribute("uib-tab-heading") ||
            node.hasAttribute("data-uib-tab-heading") ||
            node.hasAttribute("x-uib-tab-heading") ||
            node.tagName.toLowerCase() === "uib-tab-heading" ||
            node.tagName.toLowerCase() === "data-uib-tab-heading" ||
            node.tagName.toLowerCase() === "x-uib-tab-heading" ||
            node.tagName.toLowerCase() === "uib:tab-heading")
        );
      }
    });
  
  angular
    .module("ui.bootstrap.timepicker", [])
  
    .constant("uibTimepickerConfig", {
      hourStep: 1,
      minuteStep: 1,
      secondStep: 1,
      showMeridian: true,
      showSeconds: false,
      meridians: null,
      readonlyInput: false,
      mousewheel: true,
      arrowkeys: true,
      showSpinners: true,
      templateUrl: "uib/template/timepicker/timepicker.html"
    })
  
    .controller("UibTimepickerController", [
      "$scope",
      "$element",
      "$attrs",
      "$parse",
      "$log",
      "$locale",
      "uibTimepickerConfig",
      function ($scope, $element, $attrs, $parse, $log, $locale, timepickerConfig) {
        var hoursModelCtrl, minutesModelCtrl, secondsModelCtrl;
        var selected = new Date(),
          watchers = [],
          ngModelCtrl = { $setViewValue: angular.noop }, // nullModelCtrl
          meridians = angular.isDefined($attrs.meridians)
            ? $scope.$parent.$eval($attrs.meridians)
            : timepickerConfig.meridians || $locale.DATETIME_FORMATS.AMPMS,
          padHours = angular.isDefined($attrs.padHours) ? $scope.$parent.$eval($attrs.padHours) : true;
  
        $scope.tabindex = angular.isDefined($attrs.tabindex) ? $attrs.tabindex : 0;
        $element.removeAttr("tabindex");
  
        this.init = function (ngModelCtrl_, inputs) {
          ngModelCtrl = ngModelCtrl_;
          ngModelCtrl.$render = this.render;
  
          ngModelCtrl.$formatters.unshift(function (modelValue) {
            return modelValue ? new Date(modelValue) : null;
          });
  
          var hoursInputEl = inputs.eq(0),
            minutesInputEl = inputs.eq(1),
            secondsInputEl = inputs.eq(2);
  
          hoursModelCtrl = hoursInputEl.controller("ngModel");
          minutesModelCtrl = minutesInputEl.controller("ngModel");
          secondsModelCtrl = secondsInputEl.controller("ngModel");
  
          var mousewheel = angular.isDefined($attrs.mousewheel)
            ? $scope.$parent.$eval($attrs.mousewheel)
            : timepickerConfig.mousewheel;
  
          if (mousewheel) {
            this.setupMousewheelEvents(hoursInputEl, minutesInputEl, secondsInputEl);
          }
  
          var arrowkeys = angular.isDefined($attrs.arrowkeys)
            ? $scope.$parent.$eval($attrs.arrowkeys)
            : timepickerConfig.arrowkeys;
          if (arrowkeys) {
            this.setupArrowkeyEvents(hoursInputEl, minutesInputEl, secondsInputEl);
          }
  
          $scope.readonlyInput = angular.isDefined($attrs.readonlyInput)
            ? $scope.$parent.$eval($attrs.readonlyInput)
            : timepickerConfig.readonlyInput;
          this.setupInputEvents(hoursInputEl, minutesInputEl, secondsInputEl);
        };
  
        var hourStep = timepickerConfig.hourStep;
        if ($attrs.hourStep) {
          watchers.push(
            $scope.$parent.$watch($parse($attrs.hourStep), function (value) {
              hourStep = +value;
            })
          );
        }
  
        var minuteStep = timepickerConfig.minuteStep;
        if ($attrs.minuteStep) {
          watchers.push(
            $scope.$parent.$watch($parse($attrs.minuteStep), function (value) {
              minuteStep = +value;
            })
          );
        }
  
        var min;
        watchers.push(
          $scope.$parent.$watch($parse($attrs.min), function (value) {
            var dt = new Date(value);
            min = isNaN(dt) ? undefined : dt;
          })
        );
  
        var max;
        watchers.push(
          $scope.$parent.$watch($parse($attrs.max), function (value) {
            var dt = new Date(value);
            max = isNaN(dt) ? undefined : dt;
          })
        );
  
        var disabled = false;
        if ($attrs.ngDisabled) {
          watchers.push(
            $scope.$parent.$watch($parse($attrs.ngDisabled), function (value) {
              disabled = value;
            })
          );
        }
  
        $scope.noIncrementHours = function () {
          var incrementedSelected = addMinutes(selected, hourStep * 60);
          return disabled || incrementedSelected > max || (incrementedSelected < selected && incrementedSelected < min);
        };
  
        $scope.noDecrementHours = function () {
          var decrementedSelected = addMinutes(selected, -hourStep * 60);
          return disabled || decrementedSelected < min || (decrementedSelected > selected && decrementedSelected > max);
        };
  
        $scope.noIncrementMinutes = function () {
          var incrementedSelected = addMinutes(selected, minuteStep);
          return disabled || incrementedSelected > max || (incrementedSelected < selected && incrementedSelected < min);
        };
  
        $scope.noDecrementMinutes = function () {
          var decrementedSelected = addMinutes(selected, -minuteStep);
          return disabled || decrementedSelected < min || (decrementedSelected > selected && decrementedSelected > max);
        };
  
        $scope.noIncrementSeconds = function () {
          var incrementedSelected = addSeconds(selected, secondStep);
          return disabled || incrementedSelected > max || (incrementedSelected < selected && incrementedSelected < min);
        };
  
        $scope.noDecrementSeconds = function () {
          var decrementedSelected = addSeconds(selected, -secondStep);
          return disabled || decrementedSelected < min || (decrementedSelected > selected && decrementedSelected > max);
        };
  
        $scope.noToggleMeridian = function () {
          if (selected.getHours() < 12) {
            return disabled || addMinutes(selected, 12 * 60) > max;
          }
  
          return disabled || addMinutes(selected, -12 * 60) < min;
        };
  
        var secondStep = timepickerConfig.secondStep;
        if ($attrs.secondStep) {
          watchers.push(
            $scope.$parent.$watch($parse($attrs.secondStep), function (value) {
              secondStep = +value;
            })
          );
        }
  
        $scope.showSeconds = timepickerConfig.showSeconds;
        if ($attrs.showSeconds) {
          watchers.push(
            $scope.$parent.$watch($parse($attrs.showSeconds), function (value) {
              $scope.showSeconds = !!value;
            })
          );
        }
  
        // 12H / 24H mode
        $scope.showMeridian = timepickerConfig.showMeridian;
        if ($attrs.showMeridian) {
          watchers.push(
            $scope.$parent.$watch($parse($attrs.showMeridian), function (value) {
              $scope.showMeridian = !!value;
  
              if (ngModelCtrl.$error.time) {
                // Evaluate from template
                var hours = getHoursFromTemplate(),
                  minutes = getMinutesFromTemplate();
                if (angular.isDefined(hours) && angular.isDefined(minutes)) {
                  selected.setHours(hours);
                  refresh();
                }
              } else {
                updateTemplate();
              }
            })
          );
        }
  
        // Get $scope.hours in 24H mode if valid
        function getHoursFromTemplate() {
          var hours = +$scope.hours;
          var valid = $scope.showMeridian ? hours > 0 && hours < 13 : hours >= 0 && hours < 24;
          if (!valid || $scope.hours === "") {
            return undefined;
          }
  
          if ($scope.showMeridian) {
            if (hours === 12) {
              hours = 0;
            }
            if ($scope.meridian === meridians[1]) {
              hours = hours + 12;
            }
          }
          return hours;
        }
  
        function getMinutesFromTemplate() {
          var minutes = +$scope.minutes;
          var valid = minutes >= 0 && minutes < 60;
          if (!valid || $scope.minutes === "") {
            return undefined;
          }
          return minutes;
        }
  
        function getSecondsFromTemplate() {
          var seconds = +$scope.seconds;
          return seconds >= 0 && seconds < 60 ? seconds : undefined;
        }
  
        function pad(value, noPad) {
          if (value === null) {
            return "";
          }
  
          return angular.isDefined(value) && value.toString().length < 2 && !noPad ? "0" + value : value.toString();
        }
  
        // Respond on mousewheel spin
        this.setupMousewheelEvents = function (hoursInputEl, minutesInputEl, secondsInputEl) {
          var isScrollingUp = function (e) {
            if (e.originalEvent) {
              e = e.originalEvent;
            }
            //pick correct delta variable depending on event
            var delta = e.wheelDelta ? e.wheelDelta : -e.deltaY;
            return e.detail || delta > 0;
          };
  
          hoursInputEl.on("mousewheel wheel", function (e) {
            if (!disabled) {
              $scope.$apply(isScrollingUp(e) ? $scope.incrementHours() : $scope.decrementHours());
            }
            e.preventDefault();
          });
  
          minutesInputEl.on("mousewheel wheel", function (e) {
            if (!disabled) {
              $scope.$apply(isScrollingUp(e) ? $scope.incrementMinutes() : $scope.decrementMinutes());
            }
            e.preventDefault();
          });
  
          secondsInputEl.on("mousewheel wheel", function (e) {
            if (!disabled) {
              $scope.$apply(isScrollingUp(e) ? $scope.incrementSeconds() : $scope.decrementSeconds());
            }
            e.preventDefault();
          });
        };
  
        // Respond on up/down arrowkeys
        this.setupArrowkeyEvents = function (hoursInputEl, minutesInputEl, secondsInputEl) {
          hoursInputEl.on("keydown", function (e) {
            if (!disabled) {
              if (e.which === 38) {
                // up
                e.preventDefault();
                $scope.incrementHours();
                $scope.$apply();
              } else if (e.which === 40) {
                // down
                e.preventDefault();
                $scope.decrementHours();
                $scope.$apply();
              }
            }
          });
  
          minutesInputEl.on("keydown", function (e) {
            if (!disabled) {
              if (e.which === 38) {
                // up
                e.preventDefault();
                $scope.incrementMinutes();
                $scope.$apply();
              } else if (e.which === 40) {
                // down
                e.preventDefault();
                $scope.decrementMinutes();
                $scope.$apply();
              }
            }
          });
  
          secondsInputEl.on("keydown", function (e) {
            if (!disabled) {
              if (e.which === 38) {
                // up
                e.preventDefault();
                $scope.incrementSeconds();
                $scope.$apply();
              } else if (e.which === 40) {
                // down
                e.preventDefault();
                $scope.decrementSeconds();
                $scope.$apply();
              }
            }
          });
        };
  
        this.setupInputEvents = function (hoursInputEl, minutesInputEl, secondsInputEl) {
          if ($scope.readonlyInput) {
            $scope.updateHours = angular.noop;
            $scope.updateMinutes = angular.noop;
            $scope.updateSeconds = angular.noop;
            return;
          }
  
          var invalidate = function (invalidHours, invalidMinutes, invalidSeconds) {
            ngModelCtrl.$setViewValue(null);
            ngModelCtrl.$setValidity("time", false);
            if (angular.isDefined(invalidHours)) {
              $scope.invalidHours = invalidHours;
              if (hoursModelCtrl) {
                hoursModelCtrl.$setValidity("hours", false);
              }
            }
  
            if (angular.isDefined(invalidMinutes)) {
              $scope.invalidMinutes = invalidMinutes;
              if (minutesModelCtrl) {
                minutesModelCtrl.$setValidity("minutes", false);
              }
            }
  
            if (angular.isDefined(invalidSeconds)) {
              $scope.invalidSeconds = invalidSeconds;
              if (secondsModelCtrl) {
                secondsModelCtrl.$setValidity("seconds", false);
              }
            }
          };
  
          $scope.updateHours = function () {
            var hours = getHoursFromTemplate(),
              minutes = getMinutesFromTemplate();
  
            ngModelCtrl.$setDirty();
  
            if (angular.isDefined(hours) && angular.isDefined(minutes)) {
              selected.setHours(hours);
              selected.setMinutes(minutes);
              if (selected < min || selected > max) {
                invalidate(true);
              } else {
                refresh("h");
              }
            } else {
              invalidate(true);
            }
          };
  
          hoursInputEl.on("blur", function (e) {
            ngModelCtrl.$setTouched();
            if (modelIsEmpty()) {
              makeValid();
            } else if ($scope.hours === null || $scope.hours === "") {
              invalidate(true);
            } else if (!$scope.invalidHours && $scope.hours < 10) {
              $scope.$apply(function () {
                $scope.hours = pad($scope.hours, !padHours);
              });
            }
          });
  
          $scope.updateMinutes = function () {
            var minutes = getMinutesFromTemplate(),
              hours = getHoursFromTemplate();
  
            ngModelCtrl.$setDirty();
  
            if (angular.isDefined(minutes) && angular.isDefined(hours)) {
              selected.setHours(hours);
              selected.setMinutes(minutes);
              if (selected < min || selected > max) {
                invalidate(undefined, true);
              } else {
                refresh("m");
              }
            } else {
              invalidate(undefined, true);
            }
          };
  
          minutesInputEl.on("blur", function (e) {
            ngModelCtrl.$setTouched();
            if (modelIsEmpty()) {
              makeValid();
            } else if ($scope.minutes === null) {
              invalidate(undefined, true);
            } else if (!$scope.invalidMinutes && $scope.minutes < 10) {
              $scope.$apply(function () {
                $scope.minutes = pad($scope.minutes);
              });
            }
          });
  
          $scope.updateSeconds = function () {
            var seconds = getSecondsFromTemplate();
  
            ngModelCtrl.$setDirty();
  
            if (angular.isDefined(seconds)) {
              selected.setSeconds(seconds);
              refresh("s");
            } else {
              invalidate(undefined, undefined, true);
            }
          };
  
          secondsInputEl.on("blur", function (e) {
            if (modelIsEmpty()) {
              makeValid();
            } else if (!$scope.invalidSeconds && $scope.seconds < 10) {
              $scope.$apply(function () {
                $scope.seconds = pad($scope.seconds);
              });
            }
          });
        };
  
        this.render = function () {
          var date = ngModelCtrl.$viewValue;
  
          if (isNaN(date)) {
            ngModelCtrl.$setValidity("time", false);
            $log.error(
              'Timepicker directive: "ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.'
            );
          } else {
            if (date) {
              selected = date;
            }
  
            if (selected < min || selected > max) {
              ngModelCtrl.$setValidity("time", false);
              $scope.invalidHours = true;
              $scope.invalidMinutes = true;
            } else {
              makeValid();
            }
            updateTemplate();
          }
        };
  
        // Call internally when we know that model is valid.
        function refresh(keyboardChange) {
          makeValid();
          ngModelCtrl.$setViewValue(new Date(selected));
          updateTemplate(keyboardChange);
        }
  
        function makeValid() {
          if (hoursModelCtrl) {
            hoursModelCtrl.$setValidity("hours", true);
          }
  
          if (minutesModelCtrl) {
            minutesModelCtrl.$setValidity("minutes", true);
          }
  
          if (secondsModelCtrl) {
            secondsModelCtrl.$setValidity("seconds", true);
          }
  
          ngModelCtrl.$setValidity("time", true);
          $scope.invalidHours = false;
          $scope.invalidMinutes = false;
          $scope.invalidSeconds = false;
        }
  
        function updateTemplate(keyboardChange) {
          if (!ngModelCtrl.$modelValue) {
            $scope.hours = null;
            $scope.minutes = null;
            $scope.seconds = null;
            $scope.meridian = meridians[0];
          } else {
            var hours = selected.getHours(),
              minutes = selected.getMinutes(),
              seconds = selected.getSeconds();
  
            if ($scope.showMeridian) {
              hours = hours === 0 || hours === 12 ? 12 : hours % 12; // Convert 24 to 12 hour system
            }
  
            $scope.hours = keyboardChange === "h" ? hours : pad(hours, !padHours);
            if (keyboardChange !== "m") {
              $scope.minutes = pad(minutes);
            }
            $scope.meridian = selected.getHours() < 12 ? meridians[0] : meridians[1];
  
            if (keyboardChange !== "s") {
              $scope.seconds = pad(seconds);
            }
            $scope.meridian = selected.getHours() < 12 ? meridians[0] : meridians[1];
          }
        }
  
        function addSecondsToSelected(seconds) {
          selected = addSeconds(selected, seconds);
          refresh();
        }
  
        function addMinutes(selected, minutes) {
          return addSeconds(selected, minutes * 60);
        }
  
        function addSeconds(date, seconds) {
          var dt = new Date(date.getTime() + seconds * 1000);
          var newDate = new Date(date);
          newDate.setHours(dt.getHours(), dt.getMinutes(), dt.getSeconds());
          return newDate;
        }
  
        function modelIsEmpty() {
          return (
            ($scope.hours === null || $scope.hours === "") &&
            ($scope.minutes === null || $scope.minutes === "") &&
            (!$scope.showSeconds || ($scope.showSeconds && ($scope.seconds === null || $scope.seconds === "")))
          );
        }
  
        $scope.showSpinners = angular.isDefined($attrs.showSpinners)
          ? $scope.$parent.$eval($attrs.showSpinners)
          : timepickerConfig.showSpinners;
  
        $scope.incrementHours = function () {
          if (!$scope.noIncrementHours()) {
            addSecondsToSelected(hourStep * 60 * 60);
          }
        };
  
        $scope.decrementHours = function () {
          if (!$scope.noDecrementHours()) {
            addSecondsToSelected(-hourStep * 60 * 60);
          }
        };
  
        $scope.incrementMinutes = function () {
          if (!$scope.noIncrementMinutes()) {
            addSecondsToSelected(minuteStep * 60);
          }
        };
  
        $scope.decrementMinutes = function () {
          if (!$scope.noDecrementMinutes()) {
            addSecondsToSelected(-minuteStep * 60);
          }
        };
  
        $scope.incrementSeconds = function () {
          if (!$scope.noIncrementSeconds()) {
            addSecondsToSelected(secondStep);
          }
        };
  
        $scope.decrementSeconds = function () {
          if (!$scope.noDecrementSeconds()) {
            addSecondsToSelected(-secondStep);
          }
        };
  
        $scope.toggleMeridian = function () {
          var minutes = getMinutesFromTemplate(),
            hours = getHoursFromTemplate();
  
          if (!$scope.noToggleMeridian()) {
            if (angular.isDefined(minutes) && angular.isDefined(hours)) {
              addSecondsToSelected(12 * 60 * (selected.getHours() < 12 ? 60 : -60));
            } else {
              $scope.meridian = $scope.meridian === meridians[0] ? meridians[1] : meridians[0];
            }
          }
        };
  
        $scope.blur = function () {
          ngModelCtrl.$setTouched();
        };
  
        $scope.$on("$destroy", function () {
          while (watchers.length) {
            watchers.shift()();
          }
        });
      }
    ])
  
    .directive("uibTimepicker", [
      "uibTimepickerConfig",
      function (uibTimepickerConfig) {
        return {
          require: ["uibTimepicker", "?^ngModel"],
          restrict: "A",
          controller: "UibTimepickerController",
          controllerAs: "timepicker",
          scope: {},
          templateUrl: function (element, attrs) {
            return attrs.templateUrl || uibTimepickerConfig.templateUrl;
          },
          link: function (scope, element, attrs, ctrls) {
            var timepickerCtrl = ctrls[0],
              ngModelCtrl = ctrls[1];
  
            if (ngModelCtrl) {
              timepickerCtrl.init(ngModelCtrl, element.find("input"));
            }
          }
        };
      }
    ]);
  
  angular
    .module("ui.bootstrap.typeahead", ["ui.bootstrap.debounce", "ui.bootstrap.position"])
  
    /**
     * A helper service that can parse typeahead's syntax (string provided by users)
     * Extracted to a separate service for ease of unit testing
     */
    .factory("uibTypeaheadParser", [
      "$parse",
      function ($parse) {
        //                      000001111111100000000000002222222200000000000000003333333333333330000000000044444444000
        var TYPEAHEAD_REGEXP = /^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?\s+for\s+(?:([\$\w][\$\w\d]*))\s+in\s+([\s\S]+?)$/;
        return {
          parse: function (input) {
            var match = input.match(TYPEAHEAD_REGEXP);
            if (!match) {
              throw new Error(
                'Expected typeahead specification in form of "_modelValue_ (as _label_)? for _item_ in _collection_"' +
                  ' but got "' +
                  input +
                  '".'
              );
            }
  
            return {
              itemName: match[3],
              source: $parse(match[4]),
              viewMapper: $parse(match[2] || match[1]),
              modelMapper: $parse(match[1])
            };
          }
        };
      }
    ])
  
    .controller("UibTypeaheadController", [
      "$scope",
      "$element",
      "$attrs",
      "$compile",
      "$parse",
      "$q",
      "$timeout",
      "$document",
      "$window",
      "$rootScope",
      "$$debounce",
      "$uibPosition",
      "uibTypeaheadParser",
      function (
        originalScope,
        element,
        attrs,
        $compile,
        $parse,
        $q,
        $timeout,
        $document,
        $window,
        $rootScope,
        $$debounce,
        $position,
        typeaheadParser
      ) {
        var HOT_KEYS = [9, 13, 27, 38, 40];
        var eventDebounceTime = 200;
        var modelCtrl, ngModelOptions;
        //SUPPORTED ATTRIBUTES (OPTIONS)
  
        //minimal no of characters that needs to be entered before typeahead kicks-in
        var minLength = originalScope.$eval(attrs.typeaheadMinLength);
        if (!minLength && minLength !== 0) {
          minLength = 1;
        }
  
        originalScope.$watch(attrs.typeaheadMinLength, function (newVal) {
          minLength = !newVal && newVal !== 0 ? 1 : newVal;
        });
  
        //minimal wait time after last character typed before typeahead kicks-in
        var waitTime = originalScope.$eval(attrs.typeaheadWaitMs) || 0;
  
        //should it restrict model values to the ones selected from the popup only?
        var isEditable = originalScope.$eval(attrs.typeaheadEditable) !== false;
        originalScope.$watch(attrs.typeaheadEditable, function (newVal) {
          isEditable = newVal !== false;
        });
  
        //binding to a variable that indicates if matches are being retrieved asynchronously
        var isLoadingSetter = $parse(attrs.typeaheadLoading).assign || angular.noop;
  
        //a function to determine if an event should cause selection
        var isSelectEvent = attrs.typeaheadShouldSelect
          ? $parse(attrs.typeaheadShouldSelect)
          : function (scope, vals) {
              var evt = vals.$event;
              return evt.which === 13 || evt.which === 9;
            };
  
        //a callback executed when a match is selected
        var onSelectCallback = $parse(attrs.typeaheadOnSelect);
  
        //should it select highlighted popup value when losing focus?
        var isSelectOnBlur = angular.isDefined(attrs.typeaheadSelectOnBlur)
          ? originalScope.$eval(attrs.typeaheadSelectOnBlur)
          : false;
  
        //binding to a variable that indicates if there were no results after the query is completed
        var isNoResultsSetter = $parse(attrs.typeaheadNoResults).assign || angular.noop;
  
        var inputFormatter = attrs.typeaheadInputFormatter ? $parse(attrs.typeaheadInputFormatter) : undefined;
  
        var appendToBody = attrs.typeaheadAppendToBody ? originalScope.$eval(attrs.typeaheadAppendToBody) : false;
  
        var appendTo = attrs.typeaheadAppendTo ? originalScope.$eval(attrs.typeaheadAppendTo) : null;
  
        var focusFirst = originalScope.$eval(attrs.typeaheadFocusFirst) !== false;
  
        //If input matches an item of the list exactly, select it automatically
        var selectOnExact = attrs.typeaheadSelectOnExact ? originalScope.$eval(attrs.typeaheadSelectOnExact) : false;
  
        //binding to a variable that indicates if dropdown is open
        var isOpenSetter = $parse(attrs.typeaheadIsOpen).assign || angular.noop;
  
        var showHint = originalScope.$eval(attrs.typeaheadShowHint) || false;
  
        //INTERNAL VARIABLES
  
        //model setter executed upon match selection
        var parsedModel = $parse(attrs.ngModel);
        var invokeModelSetter = $parse(attrs.ngModel + "($$$p)");
        var $setModelValue = function (scope, newValue) {
          if (angular.isFunction(parsedModel(originalScope)) && ngModelOptions.getOption("getterSetter")) {
            return invokeModelSetter(scope, { $$$p: newValue });
          }
  
          return parsedModel.assign(scope, newValue);
        };
  
        //expressions used by typeahead
        var parserResult = typeaheadParser.parse(attrs.uibTypeahead);
  
        var hasFocus;
  
        //Used to avoid bug in iOS webview where iOS keyboard does not fire
        //mousedown & mouseup events
        //Issue #3699
        var selected;
  
        //create a child scope for the typeahead directive so we are not polluting original scope
        //with typeahead-specific data (matches, query etc.)
        var scope = originalScope.$new();
        var offDestroy = originalScope.$on("$destroy", function () {
          scope.$destroy();
        });
        scope.$on("$destroy", offDestroy);
  
        // WAI-ARIA
        var popupId = "typeahead-" + scope.$id + "-" + Math.floor(Math.random() * 10000);
        element.attr({
          "aria-autocomplete": "list",
          "aria-expanded": false,
          "aria-owns": popupId
        });
  
        var inputsContainer, hintInputElem;
        //add read-only input to show hint
        if (showHint) {
          inputsContainer = angular.element("<div></div>");
          inputsContainer.css("position", "relative");
          element.after(inputsContainer);
          hintInputElem = element.clone();
          hintInputElem.attr("placeholder", "");
          hintInputElem.attr("tabindex", "-1");
          hintInputElem.val("");
          hintInputElem.css({
            position: "absolute",
            top: "0px",
            left: "0px",
            "border-color": "transparent",
            "box-shadow": "none",
            opacity: 1,
            background: "none 0% 0% / auto repeat scroll padding-box border-box rgb(255, 255, 255)",
            color: "#999"
          });
          element.css({
            position: "relative",
            "vertical-align": "top",
            "background-color": "transparent"
          });
  
          if (hintInputElem.attr("id")) {
            hintInputElem.removeAttr("id"); // remove duplicate id if present.
          }
          inputsContainer.append(hintInputElem);
          hintInputElem.after(element);
        }
  
        //pop-up element used to display matches
        var popUpEl = angular.element("<div uib-typeahead-popup></div>");
        popUpEl.attr({
          id: popupId,
          matches: "matches",
          active: "activeIdx",
          select: "select(activeIdx, evt)",
          "move-in-progress": "moveInProgress",
          query: "query",
          position: "position",
          "assign-is-open": "assignIsOpen(isOpen)",
          debounce: "debounceUpdate"
        });
        //custom item template
        if (angular.isDefined(attrs.typeaheadTemplateUrl)) {
          popUpEl.attr("template-url", attrs.typeaheadTemplateUrl);
        }
  
        if (angular.isDefined(attrs.typeaheadPopupTemplateUrl)) {
          popUpEl.attr("popup-template-url", attrs.typeaheadPopupTemplateUrl);
        }
  
        var resetHint = function () {
          if (showHint) {
            hintInputElem.val("");
          }
        };
  
        var resetMatches = function () {
          scope.matches = [];
          scope.activeIdx = -1;
          element.attr("aria-expanded", false);
          resetHint();
        };
  
        var getMatchId = function (index) {
          return popupId + "-option-" + index;
        };
  
        // Indicate that the specified match is the active (pre-selected) item in the list owned by this typeahead.
        // This attribute is added or removed automatically when the `activeIdx` changes.
        scope.$watch("activeIdx", function (index) {
          if (index < 0) {
            element.removeAttr("aria-activedescendant");
          } else {
            element.attr("aria-activedescendant", getMatchId(index));
          }
        });
  
        var inputIsExactMatch = function (inputValue, index) {
          if (scope.matches.length > index && inputValue) {
            return inputValue.toUpperCase() === scope.matches[index].label.toUpperCase();
          }
  
          return false;
        };
  
        var getMatchesAsync = function (inputValue, evt) {
          var locals = { $viewValue: inputValue };
          isLoadingSetter(originalScope, true);
          isNoResultsSetter(originalScope, false);
          $q.when(parserResult.source(originalScope, locals)).then(
            function (matches) {
              //it might happen that several async queries were in progress if a user were typing fast
              //but we are interested only in responses that correspond to the current view value
              var onCurrentRequest = inputValue === modelCtrl.$viewValue;
              if (onCurrentRequest && hasFocus) {
                if (matches && matches.length > 0) {
                  scope.activeIdx = focusFirst ? 0 : -1;
                  isNoResultsSetter(originalScope, false);
                  scope.matches.length = 0;
  
                  //transform labels
                  for (var i = 0; i < matches.length; i++) {
                    locals[parserResult.itemName] = matches[i];
                    scope.matches.push({
                      id: getMatchId(i),
                      label: parserResult.viewMapper(scope, locals),
                      model: matches[i]
                    });
                  }
  
                  scope.query = inputValue;
                  //position pop-up with matches - we need to re-calculate its position each time we are opening a window
                  //with matches as a pop-up might be absolute-positioned and position of an input might have changed on a page
                  //due to other elements being rendered
                  recalculatePosition();
  
                  element.attr("aria-expanded", true);
  
                  //Select the single remaining option if user input matches
                  if (selectOnExact && scope.matches.length === 1 && inputIsExactMatch(inputValue, 0)) {
                    if (angular.isNumber(scope.debounceUpdate) || angular.isObject(scope.debounceUpdate)) {
                      $$debounce(
                        function () {
                          scope.select(0, evt);
                        },
                        angular.isNumber(scope.debounceUpdate) ? scope.debounceUpdate : scope.debounceUpdate["default"]
                      );
                    } else {
                      scope.select(0, evt);
                    }
                  }
  
                  if (showHint) {
                    var firstLabel = scope.matches[0].label;
                    if (
                      angular.isString(inputValue) &&
                      inputValue.length > 0 &&
                      firstLabel.slice(0, inputValue.length).toUpperCase() === inputValue.toUpperCase()
                    ) {
                      hintInputElem.val(inputValue + firstLabel.slice(inputValue.length));
                    } else {
                      hintInputElem.val("");
                    }
                  }
                } else {
                  resetMatches();
                  isNoResultsSetter(originalScope, true);
                }
              }
              if (onCurrentRequest) {
                isLoadingSetter(originalScope, false);
              }
            },
            function () {
              resetMatches();
              isLoadingSetter(originalScope, false);
              isNoResultsSetter(originalScope, true);
            }
          );
        };
  
        // bind events only if appendToBody params exist - performance feature
        if (appendToBody) {
          angular.element($window).on("resize", fireRecalculating);
          $document.find("body").on("scroll", fireRecalculating);
        }
  
        // Declare the debounced function outside recalculating for
        // proper debouncing
        var debouncedRecalculate = $$debounce(function () {
          // if popup is visible
          if (scope.matches.length) {
            recalculatePosition();
          }
  
          scope.moveInProgress = false;
        }, eventDebounceTime);
  
        // Default progress type
        scope.moveInProgress = false;
  
        function fireRecalculating() {
          if (!scope.moveInProgress) {
            scope.moveInProgress = true;
            scope.$digest();
          }
  
          debouncedRecalculate();
        }
  
        // recalculate actual position and set new values to scope
        // after digest loop is popup in right position
        function recalculatePosition() {
          scope.position = appendToBody ? $position.offset(element) : $position.position(element);
          scope.position.top += element.prop("offsetHeight");
        }
  
        //we need to propagate user's query so we can higlight matches
        scope.query = undefined;
  
        //Declare the timeout promise var outside the function scope so that stacked calls can be cancelled later
        var timeoutPromise;
  
        var scheduleSearchWithTimeout = function (inputValue) {
          timeoutPromise = $timeout(function () {
            getMatchesAsync(inputValue);
          }, waitTime);
        };
  
        var cancelPreviousTimeout = function () {
          if (timeoutPromise) {
            $timeout.cancel(timeoutPromise);
          }
        };
  
        resetMatches();
  
        scope.assignIsOpen = function (isOpen) {
          isOpenSetter(originalScope, isOpen);
        };
  
        scope.select = function (activeIdx, evt) {
          //called from within the $digest() cycle
          var locals = {};
          var model, item;
  
          selected = true;
          locals[parserResult.itemName] = item = scope.matches[activeIdx].model;
          model = parserResult.modelMapper(originalScope, locals);
          $setModelValue(originalScope, model);
          modelCtrl.$setValidity("editable", true);
          modelCtrl.$setValidity("parse", true);
  
          onSelectCallback(originalScope, {
            $item: item,
            $model: model,
            $label: parserResult.viewMapper(originalScope, locals),
            $event: evt
          });
  
          resetMatches();
  
          //return focus to the input element if a match was selected via a mouse click event
          // use timeout to avoid $rootScope:inprog error
          if (scope.$eval(attrs.typeaheadFocusOnSelect) !== false) {
            $timeout(
              function () {
                element[0].focus();
              },
              0,
              false
            );
          }
        };
  
        //bind keyboard events: arrows up(38) / down(40), enter(13) and tab(9), esc(27)
        element.on("keydown", function (evt) {
          //typeahead is open and an "interesting" key was pressed
          if (scope.matches.length === 0 || HOT_KEYS.indexOf(evt.which) === -1) {
            return;
          }
  
          var shouldSelect = isSelectEvent(originalScope, { $event: evt });
  
          /**
           * if there's nothing selected (i.e. focusFirst) and enter or tab is hit
           * or
           * shift + tab is pressed to bring focus to the previous element
           * then clear the results
           */
          if ((scope.activeIdx === -1 && shouldSelect) || (evt.which === 9 && !!evt.shiftKey)) {
            resetMatches();
            scope.$digest();
            return;
          }
  
          evt.preventDefault();
          var target;
          switch (evt.which) {
            case 27: // escape
              evt.stopPropagation();
  
              resetMatches();
              originalScope.$digest();
              break;
            case 38: // up arrow
              scope.activeIdx = (scope.activeIdx > 0 ? scope.activeIdx : scope.matches.length) - 1;
              scope.$digest();
              target = popUpEl[0].querySelectorAll(".uib-typeahead-match")[scope.activeIdx];
              target.parentNode.scrollTop = target.offsetTop;
              break;
            case 40: // down arrow
              scope.activeIdx = (scope.activeIdx + 1) % scope.matches.length;
              scope.$digest();
              target = popUpEl[0].querySelectorAll(".uib-typeahead-match")[scope.activeIdx];
              target.parentNode.scrollTop = target.offsetTop;
              break;
            default:
              if (shouldSelect) {
                scope.$apply(function () {
                  if (angular.isNumber(scope.debounceUpdate) || angular.isObject(scope.debounceUpdate)) {
                    $$debounce(
                      function () {
                        scope.select(scope.activeIdx, evt);
                      },
                      angular.isNumber(scope.debounceUpdate) ? scope.debounceUpdate : scope.debounceUpdate["default"]
                    );
                  } else {
                    scope.select(scope.activeIdx, evt);
                  }
                });
              }
          }
        });
  
        element.on("focus", function (evt) {
          hasFocus = true;
          if (minLength === 0 && !modelCtrl.$viewValue) {
            $timeout(function () {
              getMatchesAsync(modelCtrl.$viewValue, evt);
            }, 0);
          }
        });
  
        element.on("blur", function (evt) {
          if (isSelectOnBlur && scope.matches.length && scope.activeIdx !== -1 && !selected) {
            selected = true;
            scope.$apply(function () {
              if (angular.isObject(scope.debounceUpdate) && angular.isNumber(scope.debounceUpdate.blur)) {
                $$debounce(function () {
                  scope.select(scope.activeIdx, evt);
                }, scope.debounceUpdate.blur);
              } else {
                scope.select(scope.activeIdx, evt);
              }
            });
          }
          if (!isEditable && modelCtrl.$error.editable) {
            modelCtrl.$setViewValue();
            scope.$apply(function () {
              // Reset validity as we are clearing
              modelCtrl.$setValidity("editable", true);
              modelCtrl.$setValidity("parse", true);
            });
            element.val("");
          }
          hasFocus = false;
          selected = false;
        });
  
        // Keep reference to click handler to unbind it.
        var dismissClickHandler = function (evt) {
          // Issue #3973
          // Firefox treats right click as a click on document
          if (element[0] !== evt.target && evt.which !== 3 && scope.matches.length !== 0) {
            resetMatches();
            if (!$rootScope.$$phase) {
              originalScope.$digest();
            }
          }
        };
  
        $document.on("click", dismissClickHandler);
  
        originalScope.$on("$destroy", function () {
          $document.off("click", dismissClickHandler);
          if (appendToBody || appendTo) {
            $popup.remove();
          }
  
          if (appendToBody) {
            angular.element($window).off("resize", fireRecalculating);
            $document.find("body").off("scroll", fireRecalculating);
          }
          // Prevent jQuery cache memory leak
          popUpEl.remove();
  
          if (showHint) {
            inputsContainer.remove();
          }
        });
  
        var $popup = $compile(popUpEl)(scope);
  
        if (appendToBody) {
          $document.find("body").append($popup);
        } else if (appendTo) {
          angular.element(appendTo).eq(0).append($popup);
        } else {
          element.after($popup);
        }
  
        this.init = function (_modelCtrl) {
          modelCtrl = _modelCtrl;
          ngModelOptions = extractOptions(modelCtrl);
  
          scope.debounceUpdate = $parse(ngModelOptions.getOption("debounce"))(originalScope);
  
          //plug into $parsers pipeline to open a typeahead on view changes initiated from DOM
          //$parsers kick-in on all the changes coming from the view as well as manually triggered by $setViewValue
          modelCtrl.$parsers.unshift(function (inputValue) {
            hasFocus = true;
  
            if (minLength === 0 || (inputValue && inputValue.length >= minLength)) {
              if (waitTime > 0) {
                cancelPreviousTimeout();
                scheduleSearchWithTimeout(inputValue);
              } else {
                getMatchesAsync(inputValue);
              }
            } else {
              isLoadingSetter(originalScope, false);
              cancelPreviousTimeout();
              resetMatches();
            }
  
            if (isEditable) {
              return inputValue;
            }
  
            if (!inputValue) {
              // Reset in case user had typed something previously.
              modelCtrl.$setValidity("editable", true);
              return null;
            }
  
            modelCtrl.$setValidity("editable", false);
            return undefined;
          });
  
          modelCtrl.$formatters.push(function (modelValue) {
            var candidateViewValue, emptyViewValue;
            var locals = {};
  
            // The validity may be set to false via $parsers (see above) if
            // the model is restricted to selected values. If the model
            // is set manually it is considered to be valid.
            if (!isEditable) {
              modelCtrl.$setValidity("editable", true);
            }
  
            if (inputFormatter) {
              locals.$model = modelValue;
              return inputFormatter(originalScope, locals);
            }
  
            //it might happen that we don't have enough info to properly render input value
            //we need to check for this situation and simply return model value if we can't apply custom formatting
            locals[parserResult.itemName] = modelValue;
            candidateViewValue = parserResult.viewMapper(originalScope, locals);
            locals[parserResult.itemName] = undefined;
            emptyViewValue = parserResult.viewMapper(originalScope, locals);
  
            return candidateViewValue !== emptyViewValue ? candidateViewValue : modelValue;
          });
        };
  
        function extractOptions(ngModelCtrl) {
          var ngModelOptions;
  
          if (angular.version.minor < 6) {
            // in angular < 1.6 $options could be missing
            // guarantee a value
            ngModelOptions = ngModelCtrl.$options || {};
  
            // mimic 1.6+ api
            ngModelOptions.getOption = function (key) {
              return ngModelOptions[key];
            };
          } else {
            // in angular >=1.6 $options is always present
            ngModelOptions = ngModelCtrl.$options;
          }
  
          return ngModelOptions;
        }
      }
    ])
  
    .directive("uibTypeahead", function () {
      return {
        controller: "UibTypeaheadController",
        require: ["ngModel", "uibTypeahead"],
        link: function (originalScope, element, attrs, ctrls) {
          ctrls[1].init(ctrls[0]);
        }
      };
    })
  
    .directive("uibTypeaheadPopup", [
      "$$debounce",
      function ($$debounce) {
        return {
          scope: {
            matches: "=",
            query: "=",
            active: "=",
            position: "&",
            moveInProgress: "=",
            select: "&",
            assignIsOpen: "&",
            debounce: "&"
          },
          replace: true,
          templateUrl: function (element, attrs) {
            return attrs.popupTemplateUrl || "uib/template/typeahead/typeahead-popup.html";
          },
          link: function (scope, element, attrs) {
            scope.templateUrl = attrs.templateUrl;
  
            scope.isOpen = function () {
              var isDropdownOpen = scope.matches.length > 0;
              scope.assignIsOpen({ isOpen: isDropdownOpen });
              return isDropdownOpen;
            };
  
            scope.isActive = function (matchIdx) {
              return scope.active === matchIdx;
            };
  
            scope.selectActive = function (matchIdx) {
              scope.active = matchIdx;
            };
  
            scope.selectMatch = function (activeIdx, evt) {
              var debounce = scope.debounce();
              if (angular.isNumber(debounce) || angular.isObject(debounce)) {
                $$debounce(
                  function () {
                    scope.select({ activeIdx: activeIdx, evt: evt });
                  },
                  angular.isNumber(debounce) ? debounce : debounce["default"]
                );
              } else {
                scope.select({ activeIdx: activeIdx, evt: evt });
              }
            };
          }
        };
      }
    ])
  
    .directive("uibTypeaheadMatch", [
      "$templateRequest",
      "$compile",
      "$parse",
      function ($templateRequest, $compile, $parse) {
        return {
          scope: {
            index: "=",
            match: "=",
            query: "="
          },
          link: function (scope, element, attrs) {
            var tplUrl = $parse(attrs.templateUrl)(scope.$parent) || "uib/template/typeahead/typeahead-match.html";
            $templateRequest(tplUrl).then(function (tplContent) {
              var tplEl = angular.element(tplContent.trim());
              element.replaceWith(tplEl);
              $compile(tplEl)(scope);
            });
          }
        };
      }
    ])
  
    .filter("uibTypeaheadHighlight", [
      "$sce",
      "$injector",
      "$log",
      function ($sce, $injector, $log) {
        var isSanitizePresent;
        isSanitizePresent = $injector.has("$sanitize");
  
        function escapeRegexp(queryToEscape) {
          // Regex: capture the whole query string and replace it with the string that will be used to match
          // the results, for example if the capture is "a" the result will be \a
          return queryToEscape.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
        }
  
        function containsHtml(matchItem) {
          return /<.*>/g.test(matchItem);
        }
  
        return function (matchItem, query) {
          if (!isSanitizePresent && containsHtml(matchItem)) {
            $log.warn("Unsafe use of typeahead please use ngSanitize"); // Warn the user about the danger
          }
          matchItem = query
            ? ("" + matchItem).replace(new RegExp(escapeRegexp(query), "gi"), "<strong>$&</strong>")
            : matchItem; // Replaces the capture string with a the same string inside of a "strong" tag
          if (!isSanitizePresent) {
            matchItem = $sce.trustAsHtml(matchItem); // If $sanitize is not present we pack the string in a $sce object for the ng-bind-html directive
          }
          return matchItem;
        };
      }
    ]);
  angular.module("ui.bootstrap.carousel").run(function () {
    !angular.$$csp().noInlineStyle &&
      !angular.$$uibCarouselCss &&
      angular
        .element(document)
        .find("head")
        .prepend(
          '<style type="text/css">.ng-animate.item:not(.left):not(.right){-webkit-transition:0s ease-in-out left;transition:0s ease-in-out left}</style>'
        );
    angular.$$uibCarouselCss = true;
  });
  angular.module("ui.bootstrap.datepicker").run(function () {
    !angular.$$csp().noInlineStyle &&
      !angular.$$uibDatepickerCss &&
      angular
        .element(document)
        .find("head")
        .prepend(
          '<style type="text/css">.uib-datepicker .uib-title{width:100%;}.uib-day button,.uib-month button,.uib-year button{min-width:100%;}.uib-left,.uib-right{width:100%}</style>'
        );
    angular.$$uibDatepickerCss = true;
  });
  angular.module("ui.bootstrap.position").run(function () {
    !angular.$$csp().noInlineStyle &&
      !angular.$$uibPositionCss &&
      angular
        .element(document)
        .find("head")
        .prepend(
          '<style type="text/css">.uib-position-measure{display:block !important;visibility:hidden !important;position:absolute !important;top:-9999px !important;left:-9999px !important;}.uib-position-scrollbar-measure{position:absolute !important;top:-9999px !important;width:50px !important;height:50px !important;overflow:scroll !important;}.uib-position-body-scrollbar-measure{overflow:scroll !important;}</style>'
        );
    angular.$$uibPositionCss = true;
  });
  angular.module("ui.bootstrap.datepickerPopup").run(function () {
    !angular.$$csp().noInlineStyle &&
      !angular.$$uibDatepickerpopupCss &&
      angular
        .element(document)
        .find("head")
        .prepend(
          '<style type="text/css">.uib-datepicker-popup.dropdown-menu{display:block;float:none;margin:0;}.uib-button-bar{padding:10px 9px 2px;}</style>'
        );
    angular.$$uibDatepickerpopupCss = true;
  });
  angular.module("ui.bootstrap.tooltip").run(function () {
    !angular.$$csp().noInlineStyle &&
      !angular.$$uibTooltipCss &&
      angular
        .element(document)
        .find("head")
        .prepend(
          '<style type="text/css">[uib-tooltip-popup].tooltip.top-left > .tooltip-arrow,[uib-tooltip-popup].tooltip.top-right > .tooltip-arrow,[uib-tooltip-popup].tooltip.bottom-left > .tooltip-arrow,[uib-tooltip-popup].tooltip.bottom-right > .tooltip-arrow,[uib-tooltip-popup].tooltip.left-top > .tooltip-arrow,[uib-tooltip-popup].tooltip.left-bottom > .tooltip-arrow,[uib-tooltip-popup].tooltip.right-top > .tooltip-arrow,[uib-tooltip-popup].tooltip.right-bottom > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.top-left > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.top-right > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.bottom-left > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.bottom-right > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.left-top > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.left-bottom > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.right-top > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.right-bottom > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.top-left > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.top-right > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.bottom-left > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.bottom-right > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.left-top > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.left-bottom > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.right-top > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.right-bottom > .tooltip-arrow,[uib-popover-popup].popover.top-left > .arrow,[uib-popover-popup].popover.top-right > .arrow,[uib-popover-popup].popover.bottom-left > .arrow,[uib-popover-popup].popover.bottom-right > .arrow,[uib-popover-popup].popover.left-top > .arrow,[uib-popover-popup].popover.left-bottom > .arrow,[uib-popover-popup].popover.right-top > .arrow,[uib-popover-popup].popover.right-bottom > .arrow,[uib-popover-html-popup].popover.top-left > .arrow,[uib-popover-html-popup].popover.top-right > .arrow,[uib-popover-html-popup].popover.bottom-left > .arrow,[uib-popover-html-popup].popover.bottom-right > .arrow,[uib-popover-html-popup].popover.left-top > .arrow,[uib-popover-html-popup].popover.left-bottom > .arrow,[uib-popover-html-popup].popover.right-top > .arrow,[uib-popover-html-popup].popover.right-bottom > .arrow,[uib-popover-template-popup].popover.top-left > .arrow,[uib-popover-template-popup].popover.top-right > .arrow,[uib-popover-template-popup].popover.bottom-left > .arrow,[uib-popover-template-popup].popover.bottom-right > .arrow,[uib-popover-template-popup].popover.left-top > .arrow,[uib-popover-template-popup].popover.left-bottom > .arrow,[uib-popover-template-popup].popover.right-top > .arrow,[uib-popover-template-popup].popover.right-bottom > .arrow{top:auto;bottom:auto;left:auto;right:auto;margin:0;}[uib-popover-popup].popover,[uib-popover-html-popup].popover,[uib-popover-template-popup].popover{display:block !important;}</style>'
        );
    angular.$$uibTooltipCss = true;
  });
  angular.module("ui.bootstrap.timepicker").run(function () {
    !angular.$$csp().noInlineStyle &&
      !angular.$$uibTimepickerCss &&
      angular.element(document).find("head").prepend('<style type="text/css">.uib-time input{width:50px;}</style>');
    angular.$$uibTimepickerCss = true;
  });
  angular.module("ui.bootstrap.typeahead").run(function () {
    !angular.$$csp().noInlineStyle &&
      !angular.$$uibTypeaheadCss &&
      angular
        .element(document)
        .find("head")
        .prepend('<style type="text/css">[uib-typeahead-popup].dropdown-menu{display:block;}</style>');
    angular.$$uibTypeaheadCss = true;
  });
  /*!
   * angular-translate - v2.18.1 - 2018-05-19
   *
   * Copyright (c) 2018 The angular-translate team, Pascal Precht; Licensed MIT
   */
  
  !(function (t, e) {
    "function" == typeof define && define.amd
      ? define([], function () {
          return e();
        })
      : "object" == typeof module && module.exports
      ? (module.exports = e())
      : e();
  })(0, function () {
    function t(e) {
      "use strict";
      var n = e.storageKey(),
        a = e.storage(),
        t = function () {
          var t = e.preferredLanguage();
          angular.isString(t) ? e.use(t) : a.put(n, e.use());
        };
      (t.displayName = "fallbackFromIncorrectStorageValue"),
        a
          ? a.get(n)
            ? e.use(a.get(n)).catch(t)
            : t()
          : angular.isString(e.preferredLanguage()) && e.use(e.preferredLanguage());
    }
    function e(t, r, e, i) {
      "use strict";
      var z,
        c,
        T,
        x,
        F,
        I,
        _,
        n,
        V,
        R,
        D,
        K,
        U,
        M,
        H,
        G,
        q = {},
        Y = [],
        B = t,
        J = [],
        Q = "translate-cloak",
        W = !1,
        X = !1,
        Z = ".",
        tt = !1,
        et = !1,
        nt = 0,
        at = !0,
        a = "default",
        s = {
          default: function (t) {
            return (t || "").split("-").join("_");
          },
          java: function (t) {
            var e = (t || "").split("-").join("_"),
              n = e.split("_");
            return 1 < n.length ? n[0].toLowerCase() + "_" + n[1].toUpperCase() : e;
          },
          bcp47: function (t) {
            var e = (t || "").split("_").join("-"),
              n = e.split("-");
            switch (n.length) {
              case 1:
                n[0] = n[0].toLowerCase();
                break;
              case 2:
                (n[0] = n[0].toLowerCase()),
                  4 === n[1].length
                    ? (n[1] = n[1].charAt(0).toUpperCase() + n[1].slice(1).toLowerCase())
                    : (n[1] = n[1].toUpperCase());
                break;
              case 3:
                (n[0] = n[0].toLowerCase()),
                  (n[1] = n[1].charAt(0).toUpperCase() + n[1].slice(1).toLowerCase()),
                  (n[2] = n[2].toUpperCase());
                break;
              default:
                return e;
            }
            return n.join("-");
          },
          "iso639-1": function (t) {
            return (t || "").split("_").join("-").split("-")[0].toLowerCase();
          }
        },
        o = function () {
          if (angular.isFunction(i.getLocale)) return i.getLocale();
          var t,
            e,
            n = r.$get().navigator,
            a = ["language", "browserLanguage", "systemLanguage", "userLanguage"];
          if (angular.isArray(n.languages))
            for (t = 0; t < n.languages.length; t++) if ((e = n.languages[t]) && e.length) return e;
          for (t = 0; t < a.length; t++) if ((e = n[a[t]]) && e.length) return e;
          return null;
        };
      o.displayName = "angular-translate/service: getFirstBrowserLanguage";
      var rt = function () {
        var t = o() || "";
        return s[a] && (t = s[a](t)), t;
      };
      rt.displayName = "angular-translate/service: getLocale";
      var it = function (t, e) {
          for (var n = 0, a = t.length; n < a; n++) if (t[n] === e) return n;
          return -1;
        },
        st = function () {
          return this.toString().replace(/^\s+|\s+$/g, "");
        },
        f = function (t) {
          return angular.isString(t) ? t.toLowerCase() : t;
        },
        ot = function (t) {
          if (t) {
            for (var e, n = [], a = f(t), r = 0, i = Y.length; r < i; r++) n.push(f(Y[r]));
            if (-1 < (r = it(n, a))) return Y[r];
            if (c)
              for (var s in c)
                if (c.hasOwnProperty(s)) {
                  var o = !1,
                    l = Object.prototype.hasOwnProperty.call(c, s) && f(s) === f(t);
                  if (
                    ("*" === s.slice(-1) && (o = f(s.slice(0, -1)) === f(t.slice(0, s.length - 1))),
                    (l || o) && ((e = c[s]), -1 < it(n, f(e))))
                  )
                    return e;
                }
            var u = t.split("_");
            return 1 < u.length && -1 < it(n, f(u[0])) ? u[0] : void 0;
          }
        },
        lt = function (t, e) {
          if (!t && !e) return q;
          if (t && !e) {
            if (angular.isString(t)) return q[t];
          } else angular.isObject(q[t]) || (q[t] = {}), angular.extend(q[t], ut(e));
          return this;
        };
      (this.translations = lt),
        (this.cloakClassName = function (t) {
          return t ? ((Q = t), this) : Q;
        }),
        (this.nestedObjectDelimeter = function (t) {
          return t ? ((Z = t), this) : Z;
        });
      var ut = function (t, e, n, a) {
        var r, i, s;
        for (r in (e || (e = []), n || (n = {}), t))
          Object.prototype.hasOwnProperty.call(t, r) &&
            ((s = t[r]),
            angular.isObject(s)
              ? ut(s, e.concat(r), n, r)
              : ((i = e.length ? "" + e.join(Z) + Z + r : r),
                e.length && r === a && (n["" + e.join(Z)] = "@:" + i),
                (n[i] = s)));
        return n;
      };
      (ut.displayName = "flatObject"),
        (this.addInterpolation = function (t) {
          return J.push(t), this;
        }),
        (this.useMessageFormatInterpolation = function () {
          return this.useInterpolation("$translateMessageFormatInterpolation");
        }),
        (this.useInterpolation = function (t) {
          return (R = t), this;
        }),
        (this.useSanitizeValueStrategy = function (t) {
          return e.useStrategy(t), this;
        }),
        (this.preferredLanguage = function (t) {
          return t ? (ct(t), this) : z;
        });
      var ct = function (t) {
        return t && (z = t), z;
      };
      (this.translationNotFoundIndicator = function (t) {
        return this.translationNotFoundIndicatorLeft(t), this.translationNotFoundIndicatorRight(t), this;
      }),
        (this.translationNotFoundIndicatorLeft = function (t) {
          return t ? ((U = t), this) : U;
        }),
        (this.translationNotFoundIndicatorRight = function (t) {
          return t ? ((M = t), this) : M;
        }),
        (this.fallbackLanguage = function (t) {
          return ft(t), this;
        });
      var ft = function (t) {
        return t
          ? (angular.isString(t) ? ((x = !0), (T = [t])) : angular.isArray(t) && ((x = !1), (T = t)),
            angular.isString(z) && it(T, z) < 0 && T.push(z),
            this)
          : x
          ? T[0]
          : T;
      };
      (this.use = function (t) {
        if (t) {
          if (!q[t] && !D) throw new Error("$translateProvider couldn't find translationTable for langKey: '" + t + "'");
          return (F = t), this;
        }
        return F;
      }),
        (this.resolveClientLocale = function () {
          return rt();
        });
      var gt = function (t) {
        return t ? ((B = t), this) : n ? n + B : B;
      };
      (this.storageKey = gt),
        (this.useUrlLoader = function (t, e) {
          return this.useLoader("$translateUrlLoader", angular.extend({ url: t }, e));
        }),
        (this.useStaticFilesLoader = function (t) {
          return this.useLoader("$translateStaticFilesLoader", t);
        }),
        (this.useLoader = function (t, e) {
          return (D = t), (K = e || {}), this;
        }),
        (this.useLocalStorage = function () {
          return this.useStorage("$translateLocalStorage");
        }),
        (this.useCookieStorage = function () {
          return this.useStorage("$translateCookieStorage");
        }),
        (this.useStorage = function (t) {
          return (_ = t), this;
        }),
        (this.storagePrefix = function (t) {
          return t ? ((n = t), this) : t;
        }),
        (this.useMissingTranslationHandlerLog = function () {
          return this.useMissingTranslationHandler("$translateMissingTranslationHandlerLog");
        }),
        (this.useMissingTranslationHandler = function (t) {
          return (V = t), this;
        }),
        (this.usePostCompiling = function (t) {
          return (W = !!t), this;
        }),
        (this.forceAsyncReload = function (t) {
          return (X = !!t), this;
        }),
        (this.uniformLanguageTag = function (t) {
          return t ? angular.isString(t) && (t = { standard: t }) : (t = {}), (a = t.standard), this;
        }),
        (this.determinePreferredLanguage = function (t) {
          var e = t && angular.isFunction(t) ? t() : rt();
          return (z = (Y.length && ot(e)) || e), this;
        }),
        (this.registerAvailableLanguageKeys = function (t, e) {
          return t ? ((Y = t), e && (c = e), this) : Y;
        }),
        (this.useLoaderCache = function (t) {
          return (
            !1 === t ? (H = void 0) : !0 === t ? (H = !0) : void 0 === t ? (H = "$translationCache") : t && (H = t), this
          );
        }),
        (this.directivePriority = function (t) {
          return void 0 === t ? nt : ((nt = t), this);
        }),
        (this.statefulFilter = function (t) {
          return void 0 === t ? at : ((at = t), this);
        }),
        (this.postProcess = function (t) {
          return (G = t || void 0), this;
        }),
        (this.keepContent = function (t) {
          return (et = !!t), this;
        }),
        (this.$get = [
          "$log",
          "$injector",
          "$rootScope",
          "$q",
          function (t, o, s, m) {
            var i,
              $,
              y,
              b = o.get(R || "$translateDefaultInterpolation"),
              S = !1,
              L = {},
              f = {},
              j = function (t, s, o, l, u, c) {
                !F && z && (F = z);
                var a = u && u !== F ? ot(u) || u : F;
                if ((u && v(u), angular.isArray(t))) {
                  return (function (t) {
                    for (
                      var a = {},
                        e = [],
                        n = function (e) {
                          var n = m.defer(),
                            t = function (t) {
                              (a[e] = t), n.resolve([e, t]);
                            };
                          return j(e, s, o, l, u, c).then(t, t), n.promise;
                        },
                        r = 0,
                        i = t.length;
                      r < i;
                      r++
                    )
                      e.push(n(t[r]));
                    return m.all(e).then(function () {
                      return a;
                    });
                  })(t);
                }
                var e = m.defer();
                t && (t = st.apply(t));
                var n = (function () {
                  var t = f[a] || f[z];
                  if ((($ = 0), _ && !t)) {
                    var e = i.get(B);
                    if (((t = f[e]), T && T.length)) {
                      var n = it(T, e);
                      ($ = 0 === n ? 1 : 0), it(T, z) < 0 && T.push(z);
                    }
                  }
                  return t;
                })();
                if (n) {
                  var r = function () {
                    u || (a = F), h(t, s, o, l, a, c).then(e.resolve, e.reject);
                  };
                  (r.displayName = "promiseResolved"), n.finally(r).catch(angular.noop);
                } else h(t, s, o, l, a, c).then(e.resolve, e.reject);
                return e.promise;
              },
              w = function (t) {
                return U && (t = [U, t].join(" ")), M && (t = [t, M].join(" ")), t;
              },
              l = function (t) {
                (F = t),
                  _ && i.put(j.storageKey(), F),
                  s.$emit("$translateChangeSuccess", { language: t }),
                  b.setLocale(F);
                var e = function (t, e) {
                  L[e].setLocale(F);
                };
                (e.displayName = "eachInterpolatorLocaleSetter"),
                  angular.forEach(L, e),
                  s.$emit("$translateChangeEnd", { language: t });
              },
              u = function (n) {
                if (!n) throw "No language key specified for loading.";
                var a = m.defer();
                s.$emit("$translateLoadingStart", { language: n }), (S = !0);
                var t = H;
                "string" == typeof t && (t = o.get(t));
                var e = angular.extend({}, K, { key: n, $http: angular.extend({}, { cache: t }, K.$http) }),
                  r = function (t) {
                    var e = {};
                    s.$emit("$translateLoadingSuccess", { language: n }),
                      angular.isArray(t)
                        ? angular.forEach(t, function (t) {
                            angular.extend(e, ut(t));
                          })
                        : angular.extend(e, ut(t)),
                      (S = !1),
                      a.resolve({ key: n, table: e }),
                      s.$emit("$translateLoadingEnd", { language: n });
                  };
                r.displayName = "onLoaderSuccess";
                var i = function (t) {
                  s.$emit("$translateLoadingError", { language: t }),
                    a.reject(t),
                    s.$emit("$translateLoadingEnd", { language: t });
                };
                return (i.displayName = "onLoaderError"), o.get(D)(e).then(r, i), a.promise;
              };
            if (_ && (!(i = o.get(_)).get || !i.put))
              throw new Error("Couldn't use storage '" + _ + "', missing get() or put() method!");
            if (J.length) {
              var e = function (t) {
                var e = o.get(t);
                e.setLocale(z || F), (L[e.getInterpolationIdentifier()] = e);
              };
              (e.displayName = "interpolationFactoryAdder"), angular.forEach(J, e);
            }
            var c = function (a, r, i, s, o) {
                var l = m.defer(),
                  t = function (t) {
                    if (Object.prototype.hasOwnProperty.call(t, r) && null !== t[r]) {
                      s.setLocale(a);
                      var e = t[r];
                      if ("@:" === e.substr(0, 2)) c(a, e.substr(2), i, s, o).then(l.resolve, l.reject);
                      else {
                        var n = s.interpolate(t[r], i, "service", o, r);
                        (n = O(r, t[r], n, i, a)), l.resolve(n);
                      }
                      s.setLocale(F);
                    } else l.reject();
                  };
                return (
                  (t.displayName = "fallbackTranslationResolver"),
                  (function (t) {
                    var e = m.defer();
                    if (Object.prototype.hasOwnProperty.call(q, t)) e.resolve(q[t]);
                    else if (f[t]) {
                      var n = function (t) {
                        lt(t.key, t.table), e.resolve(t.table);
                      };
                      (n.displayName = "translationTableResolver"), f[t].then(n, e.reject);
                    } else e.reject();
                    return e.promise;
                  })(a).then(t, l.reject),
                  l.promise
                );
              },
              g = function (t, e, n, a, r) {
                var i,
                  s = q[t];
                if (s && Object.prototype.hasOwnProperty.call(s, e) && null !== s[e]) {
                  if (
                    (a.setLocale(t),
                    (i = a.interpolate(s[e], n, "filter", r, e)),
                    (i = O(e, s[e], i, n, t, r)),
                    !angular.isString(i) && angular.isFunction(i.$$unwrapTrustedValue))
                  ) {
                    var o = i.$$unwrapTrustedValue();
                    if ("@:" === o.substr(0, 2)) return g(t, o.substr(2), n, a, r);
                  } else if ("@:" === i.substr(0, 2)) return g(t, i.substr(2), n, a, r);
                  a.setLocale(F);
                }
                return i;
              },
              C = function (t, e, n, a) {
                return V ? o.get(V)(t, F, e, n, a) : t;
              },
              N = function (t, e, n, a, r, i) {
                var s = m.defer();
                if (t < T.length) {
                  var o = T[t];
                  c(o, e, n, a, i).then(
                    function (t) {
                      s.resolve(t);
                    },
                    function () {
                      return N(t + 1, e, n, a, r, i).then(s.resolve, s.reject);
                    }
                  );
                } else if (r) s.resolve(r);
                else {
                  var l = C(e, n, r);
                  V && l ? s.resolve(l) : s.reject(w(e));
                }
                return s.promise;
              },
              p = function (t, e, n, a, r) {
                var i;
                if (t < T.length) {
                  var s = T[t];
                  (i = g(s, e, n, a, r)) || "" === i || (i = p(t + 1, e, n, a));
                }
                return i;
              },
              h = function (t, e, n, a, r, i) {
                var s,
                  o,
                  l,
                  u,
                  c,
                  f = m.defer(),
                  g = r ? q[r] : q,
                  p = n ? L[n] : b;
                if (g && Object.prototype.hasOwnProperty.call(g, t) && null !== g[t]) {
                  var h = g[t];
                  if ("@:" === h.substr(0, 2)) j(h.substr(2), e, n, a, r, i).then(f.resolve, f.reject);
                  else {
                    var d = p.interpolate(h, e, "service", i, t);
                    (d = O(t, h, d, e, r)), f.resolve(d);
                  }
                } else {
                  var v;
                  V && !S && (v = C(t, e, a)),
                    r && T && T.length
                      ? ((s = t), (o = e), (l = p), (u = a), (c = i), N(0 < y ? y : $, s, o, l, u, c)).then(
                          function (t) {
                            f.resolve(t);
                          },
                          function (t) {
                            f.reject(w(t));
                          }
                        )
                      : V && !S && v
                      ? a
                        ? f.resolve(a)
                        : f.resolve(v)
                      : a
                      ? f.resolve(a)
                      : f.reject(w(t));
                }
                return f.promise;
              },
              d = function (t, e, n, a, r) {
                var i,
                  s = a ? q[a] : q,
                  o = b;
                if (
                  (L && Object.prototype.hasOwnProperty.call(L, n) && (o = L[n]),
                  s && Object.prototype.hasOwnProperty.call(s, t) && null !== s[t])
                ) {
                  var l = s[t];
                  "@:" === l.substr(0, 2)
                    ? (i = d(l.substr(2), e, n, a, r))
                    : ((i = o.interpolate(l, e, "filter", r, t)), (i = O(t, l, i, e, a, r)));
                } else {
                  var u;
                  V && !S && (u = C(t, e, r)),
                    (i = a && T && T.length ? p(($ = 0) < y ? y : $, t, e, o, r) : V && !S && u ? u : w(t));
                }
                return i;
              },
              O = function (t, e, n, a, r, i) {
                var s = G;
                return s && ("string" == typeof s && (s = o.get(s)), s) ? s(t, e, n, a, r, i) : n;
              },
              v = function (t) {
                q[t] ||
                  !D ||
                  f[t] ||
                  (f[t] = u(t).then(function (t) {
                    return lt(t.key, t.table), t;
                  }));
              };
            (j.preferredLanguage = function (t) {
              return t && ct(t), z;
            }),
              (j.cloakClassName = function () {
                return Q;
              }),
              (j.nestedObjectDelimeter = function () {
                return Z;
              }),
              (j.fallbackLanguage = function (t) {
                if (null != t) {
                  if ((ft(t), D && T && T.length))
                    for (var e = 0, n = T.length; e < n; e++) f[T[e]] || (f[T[e]] = u(T[e]));
                  j.use(j.use());
                }
                return x ? T[0] : T;
              }),
              (j.useFallbackLanguage = function (t) {
                if (null != t)
                  if (t) {
                    var e = it(T, t);
                    -1 < e && (y = e);
                  } else y = 0;
              }),
              (j.proposedLanguage = function () {
                return I;
              }),
              (j.storage = function () {
                return i;
              }),
              (j.negotiateLocale = ot),
              (j.use = function (e) {
                if (!e) return F;
                var n = m.defer();
                n.promise.then(null, angular.noop), s.$emit("$translateChangeStart", { language: e });
                var t = ot(e);
                return 0 < Y.length && !t
                  ? m.reject(e)
                  : (t && (e = t),
                    (I = e),
                    (!X && q[e]) || !D || f[e]
                      ? f[e]
                        ? f[e].then(
                            function (t) {
                              return I === t.key && l(t.key), n.resolve(t.key), t;
                            },
                            function (t) {
                              return !F && T && 0 < T.length && T[0] !== t
                                ? j.use(T[0]).then(n.resolve, n.reject)
                                : n.reject(t);
                            }
                          )
                        : (n.resolve(e), l(e))
                      : ((f[e] = u(e).then(
                          function (t) {
                            return lt(t.key, t.table), n.resolve(t.key), I === e && l(t.key), t;
                          },
                          function (t) {
                            return (
                              s.$emit("$translateChangeError", { language: t }),
                              n.reject(t),
                              s.$emit("$translateChangeEnd", { language: t }),
                              m.reject(t)
                            );
                          }
                        )),
                        f[e]
                          .finally(function () {
                            var t;
                            I === (t = e) && (I = void 0), (f[t] = void 0);
                          })
                          .catch(angular.noop)),
                    n.promise);
              }),
              (j.resolveClientLocale = function () {
                return rt();
              }),
              (j.storageKey = function () {
                return gt();
              }),
              (j.isPostCompilingEnabled = function () {
                return W;
              }),
              (j.isForceAsyncReloadEnabled = function () {
                return X;
              }),
              (j.isKeepContent = function () {
                return et;
              }),
              (j.refresh = function (t) {
                if (!D) throw new Error("Couldn't refresh translation table, no loader registered!");
                s.$emit("$translateRefreshStart", { language: t });
                var e = m.defer(),
                  n = {};
                function a(e) {
                  var t = u(e);
                  return (
                    (f[e] = t).then(function (t) {
                      (q[e] = {}), lt(e, t.table), (n[e] = !0);
                    }, angular.noop),
                    t
                  );
                }
                if (
                  (e.promise
                    .then(function () {
                      for (var t in q) q.hasOwnProperty(t) && (t in n || delete q[t]);
                      F && l(F);
                    }, angular.noop)
                    .finally(function () {
                      s.$emit("$translateRefreshEnd", { language: t });
                    }),
                  t)
                )
                  q[t] ? a(t).then(e.resolve, e.reject) : e.reject();
                else {
                  var r = (T && T.slice()) || [];
                  F && -1 === r.indexOf(F) && r.push(F), m.all(r.map(a)).then(e.resolve, e.reject);
                }
                return e.promise;
              }),
              (j.instant = function (t, e, n, a, r) {
                var i = a && a !== F ? ot(a) || a : F;
                if (null === t || angular.isUndefined(t)) return t;
                if ((a && v(a), angular.isArray(t))) {
                  for (var s = {}, o = 0, l = t.length; o < l; o++) s[t[o]] = j.instant(t[o], e, n, a, r);
                  return s;
                }
                if (angular.isString(t) && t.length < 1) return t;
                t && (t = st.apply(t));
                var u,
                  c,
                  f = [];
                z && f.push(z), i && f.push(i), T && T.length && (f = f.concat(T));
                for (var g = 0, p = f.length; g < p; g++) {
                  var h = f[g];
                  if ((q[h] && void 0 !== q[h][t] && (u = d(t, e, n, i, r)), void 0 !== u)) break;
                }
                u ||
                  "" === u ||
                  (U || M
                    ? (u = w(t))
                    : ((u = b.interpolate(t, e, "filter", r)), V && !S && (c = C(t, e, r)), V && !S && c && (u = c)));
                return u;
              }),
              (j.versionInfo = function () {
                return "2.18.1";
              }),
              (j.loaderCache = function () {
                return H;
              }),
              (j.directivePriority = function () {
                return nt;
              }),
              (j.statefulFilter = function () {
                return at;
              }),
              (j.isReady = function () {
                return tt;
              });
            var n = m.defer();
            n.promise.then(function () {
              tt = !0;
            }),
              (j.onReady = function (t) {
                var e = m.defer();
                return (
                  angular.isFunction(t) && e.promise.then(t), tt ? e.resolve() : n.promise.then(e.resolve), e.promise
                );
              }),
              (j.getAvailableLanguageKeys = function () {
                return 0 < Y.length ? Y : null;
              }),
              (j.getTranslationTable = function (t) {
                return (t = t || j.use()) && q[t] ? angular.copy(q[t]) : null;
              });
            var a = s.$on("$translateReady", function () {
                n.resolve(), a(), (a = null);
              }),
              r = s.$on("$translateChangeEnd", function () {
                n.resolve(), r(), (r = null);
              });
            if (D) {
              if ((angular.equals(q, {}) && j.use() && j.use(j.use()), T && T.length))
                for (
                  var E = function (t) {
                      return lt(t.key, t.table), s.$emit("$translateChangeEnd", { language: t.key }), t;
                    },
                    k = 0,
                    P = T.length;
                  k < P;
                  k++
                ) {
                  var A = T[k];
                  (!X && q[A]) || (f[A] = u(A).then(E));
                }
            } else s.$emit("$translateReady", { language: j.use() });
            return j;
          }
        ]);
    }
    function n(s, o) {
      "use strict";
      var t = {};
      return (
        (t.setLocale = function (t) {
          t;
        }),
        (t.getInterpolationIdentifier = function () {
          return "default";
        }),
        (t.useSanitizeValueStrategy = function (t) {
          return o.useStrategy(t), this;
        }),
        (t.interpolate = function (t, e, n, a, r) {
          var i;
          return (
            (e = e || {}),
            (e = o.sanitize(e, "params", a, n)),
            angular.isNumber(t)
              ? (i = "" + t)
              : angular.isString(t)
              ? ((i = s(t)(e)), (i = o.sanitize(i, "text", a, n)))
              : (i = ""),
            i
          );
        }),
        t
      );
    }
    function a(S, L, j, w, C) {
      "use strict";
      var N = function (t) {
        return angular.isString(t) ? t.toLowerCase() : t;
      };
      return {
        restrict: "AE",
        scope: !0,
        priority: S.directivePriority(),
        compile: function (t, h) {
          var d = h.translateValues ? h.translateValues : void 0,
            v = h.translateInterpolation ? h.translateInterpolation : void 0,
            m = h.translateSanitizeStrategy ? h.translateSanitizeStrategy : void 0,
            $ = t[0].outerHTML.match(/translate-value-+/i),
            y = "^(.*)(" + L.startSymbol() + ".*" + L.endSymbol() + ")(.*)",
            b = "^(.*)" + L.startSymbol() + "(.*)" + L.endSymbol() + "(.*)";
          return function (r, l, u) {
            (r.interpolateParams = {}),
              (r.preText = ""),
              (r.postText = ""),
              (r.translateNamespace = (function t(e) {
                if (e.translateNamespace) return e.translateNamespace;
                if (e.$parent) return t(e.$parent);
              })(r));
            var i = {},
              s = function (t) {
                if (
                  (angular.isFunction(s._unwatchOld) && (s._unwatchOld(), (s._unwatchOld = void 0)),
                  angular.equals(t, "") || !angular.isDefined(t))
                ) {
                  var e = function () {
                      return this.toString().replace(/^\s+|\s+$/g, "");
                    }.apply(l.text()),
                    n = e.match(y);
                  if (angular.isArray(n)) {
                    (r.preText = n[1]), (r.postText = n[3]), (i.translate = L(n[2])(r.$parent));
                    var a = e.match(b);
                    angular.isArray(a) &&
                      a[2] &&
                      a[2].length &&
                      (s._unwatchOld = r.$watch(a[2], function (t) {
                        (i.translate = t), c();
                      }));
                  } else i.translate = e || void 0;
                } else i.translate = t;
                c();
              },
              t = function (e) {
                u.$observe(e, function (t) {
                  (i[e] = t), c();
                });
              };
            !(function (t, e, n) {
              if ((e.translateValues && angular.extend(t, w(e.translateValues)(r.$parent)), $))
                for (var a in n)
                  Object.prototype.hasOwnProperty.call(e, a) &&
                    "translateValue" === a.substr(0, 14) &&
                    "translateValues" !== a &&
                    (t[N(a.substr(14, 1)) + a.substr(15)] = n[a]);
            })(r.interpolateParams, u, h);
            var e = !0;
            for (var n in (u.$observe("translate", function (t) {
              void 0 === t ? s("") : ("" === t && e) || ((i.translate = t), c()), (e = !1);
            }),
            u))
              u.hasOwnProperty(n) && "translateAttr" === n.substr(0, 13) && 13 < n.length && t(n);
            if (
              (u.$observe("translateDefault", function (t) {
                (r.defaultText = t), c();
              }),
              m &&
                u.$observe("translateSanitizeStrategy", function (t) {
                  (r.sanitizeStrategy = w(t)(r.$parent)), c();
                }),
              d &&
                u.$observe("translateValues", function (t) {
                  t &&
                    r.$parent.$watch(function () {
                      angular.extend(r.interpolateParams, w(t)(r.$parent));
                    });
                }),
              $)
            ) {
              var a = function (n) {
                u.$observe(n, function (t) {
                  var e = N(n.substr(14, 1)) + n.substr(15);
                  r.interpolateParams[e] = t;
                });
              };
              for (var o in u)
                Object.prototype.hasOwnProperty.call(u, o) &&
                  "translateValue" === o.substr(0, 14) &&
                  "translateValues" !== o &&
                  a(o);
            }
            var c = function () {
                for (var t in i)
                  i.hasOwnProperty(t) &&
                    void 0 !== i[t] &&
                    f(t, i[t], r, r.interpolateParams, r.defaultText, r.translateNamespace);
              },
              f = function (e, t, n, a, r, i) {
                t
                  ? (i && "." === t.charAt(0) && (t = i + t),
                    S(t, a, v, r, n.translateLanguage, n.sanitizeStrategy).then(
                      function (t) {
                        g(t, n, !0, e);
                      },
                      function (t) {
                        g(t, n, !1, e);
                      }
                    ))
                  : g(t, n, !1, e);
              },
              g = function (t, e, n, a) {
                if ((n || (void 0 !== e.defaultText && (t = e.defaultText)), "translate" === a)) {
                  (n || (!n && !S.isKeepContent() && void 0 === u.translateKeepContent)) &&
                    l.empty().append(e.preText + t + e.postText);
                  var r = S.isPostCompilingEnabled(),
                    i = void 0 !== h.translateCompile,
                    s = i && "false" !== h.translateCompile;
                  ((r && !i) || s) && j(l.contents())(e);
                } else {
                  var o = u.$attr[a];
                  "data-" === o.substr(0, 5) && (o = o.substr(5)), (o = o.substr(15)), l.attr(o, t);
                }
              };
            (d || $ || u.translateDefault) && r.$watch("interpolateParams", c, !0), r.$on("translateLanguageChanged", c);
            var p = C.$on("$translateChangeSuccess", c);
            l.text().length ? (u.translate ? s(u.translate) : s("")) : u.translate && s(u.translate),
              c(),
              r.$on("$destroy", p);
          };
        }
      };
    }
    function r(u, c) {
      "use strict";
      return {
        restrict: "A",
        priority: u.directivePriority(),
        link: function (n, a, r) {
          var i,
            s,
            o,
            l = {},
            t = function () {
              angular.forEach(i, function (t, e) {
                t &&
                  ((l[e] = !0),
                  n.translateNamespace && "." === t.charAt(0) && (t = n.translateNamespace + t),
                  u(t, s, r.translateInterpolation, void 0, n.translateLanguage, o).then(
                    function (t) {
                      a.attr(e, t);
                    },
                    function (t) {
                      a.attr(e, t);
                    }
                  ));
              }),
                angular.forEach(l, function (t, e) {
                  i[e] || (a.removeAttr(e), delete l[e]);
                });
            };
          f(
            n,
            r.translateAttr,
            function (t) {
              i = t;
            },
            t
          ),
            f(
              n,
              r.translateValues,
              function (t) {
                s = t;
              },
              t
            ),
            f(
              n,
              r.translateSanitizeStrategy,
              function (t) {
                o = t;
              },
              t
            ),
            r.translateValues && n.$watch(r.translateValues, t, !0),
            n.$on("translateLanguageChanged", t);
          var e = c.$on("$translateChangeSuccess", t);
          t(), n.$on("$destroy", e);
        }
      };
    }
    function f(t, e, n, a) {
      "use strict";
      e &&
        ("::" === e.substr(0, 2)
          ? (e = e.substr(2))
          : t.$watch(
              e,
              function (t) {
                n(t), a();
              },
              !0
            ),
        n(t.$eval(e)));
    }
    function i(s, o) {
      "use strict";
      return {
        compile: function (t) {
          var i = function (t) {
            t.addClass(s.cloakClassName());
          };
          return (
            i(t),
            function (t, e, n) {
              var a = function (t) {
                  t.removeClass(s.cloakClassName());
                }.bind(this, e),
                r = i.bind(this, e);
              n.translateCloak && n.translateCloak.length
                ? (n.$observe("translateCloak", function (t) {
                    s(t).then(a, r);
                  }),
                  o.$on("$translateChangeSuccess", function () {
                    s(n.translateCloak).then(a, r);
                  }))
                : s.onReady(a);
            }
          );
        }
      };
    }
    function s() {
      "use strict";
      return {
        restrict: "A",
        scope: !0,
        compile: function () {
          return {
            pre: function (t, e, n) {
              (t.translateNamespace = (function t(e) {
                if (e.translateNamespace) return e.translateNamespace;
                if (e.$parent) return t(e.$parent);
              })(t)),
                t.translateNamespace && "." === n.translateNamespace.charAt(0)
                  ? (t.translateNamespace += n.translateNamespace)
                  : (t.translateNamespace = n.translateNamespace);
            }
          };
        }
      };
    }
    function o() {
      "use strict";
      return {
        restrict: "A",
        scope: !0,
        compile: function () {
          return function (e, t, n) {
            n.$observe("translateLanguage", function (t) {
              e.translateLanguage = t;
            }),
              e.$watch("translateLanguage", function () {
                e.$broadcast("translateLanguageChanged");
              });
          };
        }
      };
    }
    function l(i, s) {
      "use strict";
      var t = function (t, e, n, a) {
        if (!angular.isObject(e)) {
          var r = this || {
            __SCOPE_IS_NOT_AVAILABLE:
              "More info at https://github.com/angular/angular.js/commit/8863b9d04c722b278fa93c5d66ad1e578ad6eb1f"
          };
          e = i(e)(r);
        }
        return s.instant(t, e, n, a);
      };
      return s.statefulFilter() && (t.$stateful = !0), t;
    }
    function u(t) {
      "use strict";
      return t("translations");
    }
    return (
      (t.$inject = ["$translate"]),
      (e.$inject = [
        "$STORAGE_KEY",
        "$windowProvider",
        "$translateSanitizationProvider",
        "pascalprechtTranslateOverrider"
      ]),
      (n.$inject = ["$interpolate", "$translateSanitization"]),
      (a.$inject = ["$translate", "$interpolate", "$compile", "$parse", "$rootScope"]),
      (r.$inject = ["$translate", "$rootScope"]),
      (i.$inject = ["$translate", "$rootScope"]),
      (l.$inject = ["$parse", "$translate"]),
      (u.$inject = ["$cacheFactory"]),
      angular.module("pascalprecht.translate", ["ng"]).run(t),
      (t.displayName = "runTranslate"),
      angular.module("pascalprecht.translate").provider("$translateSanitization", function () {
        "use strict";
        var n,
          a,
          g,
          p = null,
          h = !1,
          d = !1;
        ((g = {
          sanitize: function (t, e) {
            return "text" === e && (t = i(t)), t;
          },
          escape: function (t, e) {
            return "text" === e && (t = r(t)), t;
          },
          sanitizeParameters: function (t, e) {
            return "params" === e && (t = o(t, i)), t;
          },
          escapeParameters: function (t, e) {
            return "params" === e && (t = o(t, r)), t;
          },
          sce: function (t, e, n) {
            return "text" === e ? (t = s(t)) : "params" === e && "filter" !== n && (t = o(t, r)), t;
          },
          sceParameters: function (t, e) {
            return "params" === e && (t = o(t, s)), t;
          }
        }).escaped = g.escapeParameters),
          (this.addStrategy = function (t, e) {
            return (g[t] = e), this;
          }),
          (this.removeStrategy = function (t) {
            return delete g[t], this;
          }),
          (this.useStrategy = function (t) {
            return (h = !0), (p = t), this;
          }),
          (this.$get = [
            "$injector",
            "$log",
            function (u, c) {
              var e,
                f = {};
              return (
                u.has("$sanitize") && (n = u.get("$sanitize")),
                u.has("$sce") && (a = u.get("$sce")),
                {
                  useStrategy:
                    ((e = this),
                    function (t) {
                      e.useStrategy(t);
                    }),
                  sanitize: function (t, e, n, a) {
                    if (
                      (p ||
                        h ||
                        d ||
                        (c.warn(
                          "pascalprecht.translate.$translateSanitization: No sanitization strategy has been configured. This can have serious security implications. See http://angular-translate.github.io/docs/#/guide/19_security for details."
                        ),
                        (d = !0)),
                      n || null === n || (n = p),
                      !n)
                    )
                      return t;
                    a || (a = "service");
                    var r,
                      i,
                      s,
                      o,
                      l = angular.isArray(n) ? n : [n];
                    return (
                      (r = t),
                      (i = e),
                      (s = a),
                      (o = l),
                      angular.forEach(o, function (e) {
                        if (angular.isFunction(e)) r = e(r, i, s);
                        else if (angular.isFunction(g[e])) r = g[e](r, i, s);
                        else {
                          if (!angular.isString(g[e]))
                            throw new Error(
                              "pascalprecht.translate.$translateSanitization: Unknown sanitization strategy: '" + e + "'"
                            );
                          if (!f[g[e]])
                            try {
                              f[g[e]] = u.get(g[e]);
                            } catch (t) {
                              throw (
                                ((f[g[e]] = function () {}),
                                new Error(
                                  "pascalprecht.translate.$translateSanitization: Unknown sanitization strategy: '" +
                                    e +
                                    "'"
                                ))
                              );
                            }
                          r = f[g[e]](r, i, s);
                        }
                      }),
                      r
                    );
                  }
                }
              );
            }
          ]);
        var r = function (t) {
            var e = angular.element("<div></div>");
            return e.text(t), e.html();
          },
          i = function (t) {
            if (!n)
              throw new Error(
                "pascalprecht.translate.$translateSanitization: Error cannot find $sanitize service. Either include the ngSanitize module (https://docs.angularjs.org/api/ngSanitize) or use a sanitization strategy which does not depend on $sanitize, such as 'escape'."
              );
            return n(t);
          },
          s = function (t) {
            if (!a) throw new Error("pascalprecht.translate.$translateSanitization: Error cannot find $sce service.");
            return a.trustAsHtml(t);
          },
          o = function (t, n, a) {
            if (angular.isDate(t)) return t;
            if (angular.isObject(t)) {
              var r = angular.isArray(t) ? [] : {};
              if (a) {
                if (-1 < a.indexOf(t))
                  throw new Error(
                    "pascalprecht.translate.$translateSanitization: Error cannot interpolate parameter due recursive object"
                  );
              } else a = [];
              return (
                a.push(t),
                angular.forEach(t, function (t, e) {
                  angular.isFunction(t) || (r[e] = o(t, n, a));
                }),
                a.splice(-1, 1),
                r
              );
            }
            return angular.isNumber(t) ? t : !0 === t || !1 === t ? t : angular.isUndefined(t) || null === t ? t : n(t);
          };
      }),
      angular.module("pascalprecht.translate").constant("pascalprechtTranslateOverrider", {}).provider("$translate", e),
      (e.displayName = "displayName"),
      angular.module("pascalprecht.translate").factory("$translateDefaultInterpolation", n),
      (n.displayName = "$translateDefaultInterpolation"),
      angular.module("pascalprecht.translate").constant("$STORAGE_KEY", "NG_TRANSLATE_LANG_KEY"),
      angular.module("pascalprecht.translate").directive("translate", a),
      (a.displayName = "translateDirective"),
      angular.module("pascalprecht.translate").directive("translateAttr", r),
      (r.displayName = "translateAttrDirective"),
      angular.module("pascalprecht.translate").directive("translateCloak", i),
      (i.displayName = "translateCloakDirective"),
      angular.module("pascalprecht.translate").directive("translateNamespace", s),
      (s.displayName = "translateNamespaceDirective"),
      angular.module("pascalprecht.translate").directive("translateLanguage", o),
      (o.displayName = "translateLanguageDirective"),
      angular.module("pascalprecht.translate").filter("translate", l),
      (l.displayName = "translateFilterFactory"),
      angular.module("pascalprecht.translate").factory("$translationCache", u),
      (u.displayName = "$translationCache"),
      "pascalprecht.translate"
    );
  });
  /**
   * @author RubaXa <trash@rubaxa.org>
   * @licence MIT
   * https://github.com/SortableJS/angular-legacy-sortablejs
   */
  
  (function (factory) {
    "use strict";
  
    if (typeof define === "function" && define.amd) {
      define(["angular", "./Sortable"], factory);
    } else if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
      require("angular");
      factory(angular, require("./Sortable"));
      module.exports = "ng-sortable";
    } else if (window.angular && window.Sortable) {
      factory(angular, Sortable);
    }
  })(function (angular, Sortable) {
    "use strict";
  
    /**
     * @typedef   {Object}        ngSortEvent
     * @property  {*}             model      List item
     * @property  {Object|Array}  models     List of items
     * @property  {number}        oldIndex   before sort
     * @property  {number}        newIndex   after sort
     */
  
    var expando = "Sortable:ng-sortable";
  
    angular
      .module("ng-sortable", [])
      .constant("ngSortableVersion", "0.4.1")
      .constant("ngSortableConfig", {})
      .directive("ngSortable", [
        "$parse",
        "ngSortableConfig",
        function ($parse, ngSortableConfig) {
          var removed, nextSibling;
  
          function getNgRepeatExpression(node) {
            return (
              node.getAttribute("ng-repeat") || node.getAttribute("data-ng-repeat") || node.getAttribute("x-ng-repeat")
            );
          }
  
          // Export
          return {
            restrict: "AC",
            scope: { ngSortable: "=?" },
            priority: 1001,
            compile: function ($element, $attr) {
              var ngRepeat = [].filter.call($element[0].childNodes, function (node) {
                return node.nodeType === Node.ELEMENT_NODE && getNgRepeatExpression(node);
              })[0];
  
              if (!ngRepeat) {
                return;
              }
  
              var match = getNgRepeatExpression(ngRepeat).match(
                /^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+track\s+by\s+([\s\S]+?))?\s*$/
              );
  
              if (!match) {
                return;
              }
  
              var rhs = match[2];
  
              return function postLink(scope, $el) {
                var itemsExpr = $parse(rhs);
                var getSource = function getSource() {
                  return itemsExpr(scope.$parent) || [];
                };
  
                var el = $el[0],
                  options = angular.extend(scope.ngSortable || {}, ngSortableConfig),
                  watchers = [],
                  offDestroy,
                  sortable;
  
                el[expando] = getSource;
  
                function _emitEvent(/**Event*/ evt, /*Mixed*/ item) {
                  var name = "on" + evt.type.charAt(0).toUpperCase() + evt.type.substr(1);
                  var source = getSource();
  
                  /* jshint expr:true */
                  options[name] &&
                    options[name]({
                      model: item || source[evt.newIndex],
                      models: source,
                      oldIndex: evt.oldIndex,
                      newIndex: evt.newIndex,
                      originalEvent: evt
                    });
                }
  
                function _sync(/**Event*/ evt) {
                  var items = getSource();
  
                  if (!items) {
                    // Without ng-repeat
                    return;
                  }
  
                  var oldIndex = evt.oldIndex,
                    newIndex = evt.newIndex;
  
                  if (el !== evt.from) {
                    var prevItems = evt.from[expando]();
  
                    removed = prevItems[oldIndex];
  
                    if (evt.clone) {
                      removed = angular.copy(removed);
                      prevItems.splice(
                        Sortable.utils.index(evt.clone, sortable.options.draggable),
                        0,
                        prevItems.splice(oldIndex, 1)[0]
                      );
                      evt.from.removeChild(evt.clone);
                    } else {
                      prevItems.splice(oldIndex, 1);
                    }
  
                    items.splice(newIndex, 0, removed);
  
                    evt.from.insertBefore(evt.item, nextSibling); // revert element
                  } else {
                    items.splice(newIndex, 0, items.splice(oldIndex, 1)[0]);
  
                    // move ng-repeat comment node to right position
                    if (nextSibling.nodeType === Node.COMMENT_NODE) {
                      evt.from.insertBefore(nextSibling, evt.item.nextSibling);
                    }
                  }
  
                  scope.$apply();
                }
  
                function _destroy() {
                  offDestroy();
  
                  angular.forEach(watchers, function (/** Function */ unwatch) {
                    unwatch();
                  });
  
                  sortable.destroy();
  
                  el[expando] = null;
                  el = null;
                  watchers = null;
                  sortable = null;
                  nextSibling = null;
                }
  
                // Initialization
                sortable = Sortable.create(
                  el,
                  Object.keys(options).reduce(
                    function (opts, name) {
                      opts[name] = opts[name] || options[name];
                      return opts;
                    },
                    {
                      onStart: function (/**Event*/ evt) {
                        nextSibling = evt.from === evt.item.parentNode ? evt.item.nextSibling : evt.clone.nextSibling;
                        _emitEvent(evt);
                        scope.$apply();
                      },
                      onEnd: function (/**Event*/ evt) {
                        _emitEvent(evt, removed);
                        scope.$apply();
                      },
                      onAdd: function (/**Event*/ evt) {
                        _sync(evt);
                        _emitEvent(evt, removed);
                        scope.$apply();
                      },
                      onUpdate: function (/**Event*/ evt) {
                        _sync(evt);
                        _emitEvent(evt);
                      },
                      onRemove: function (/**Event*/ evt) {
                        _emitEvent(evt, removed);
                      },
                      onSort: function (/**Event*/ evt) {
                        _emitEvent(evt);
                      }
                    }
                  )
                );
  
                // Create watchers for `options`
                angular.forEach(
                  [
                    "sort",
                    "disabled",
                    "draggable",
                    "handle",
                    "animation",
                    "group",
                    "ghostClass",
                    "filter",
                    "onStart",
                    "onEnd",
                    "onAdd",
                    "onUpdate",
                    "onRemove",
                    "onSort",
                    "onMove",
                    "onClone",
                    "setData"
                  ],
                  function (name) {
                    watchers.push(
                      scope.$watch("ngSortable." + name, function (value) {
                        if (value !== void 0) {
                          options[name] = value;
  
                          if (!/^on[A-Z]/.test(name)) {
                            sortable.option(name, value);
                          }
                        }
                      })
                    );
                  }
                );
  
                offDestroy = scope.$on("$destroy", _destroy);
              };
            }
          };
        }
      ]);
  });
  angular.module("mwFormViewer", ["ngSanitize", "ui.bootstrap", "ng-sortable", "pascalprecht.translate"]),
    angular.module("mwFormViewer").directive("mwPriorityList", function () {
      return {
        replace: !0,
        restrict: "AE",
        require: "^mwFormQuestion",
        scope: { question: "=", questionResponse: "=", readOnly: "=?", options: "=?" },
        templateUrl: "mw-priority-list.html",
        controllerAs: "ctrl",
        bindToController: !0,
        controller: function () {
          function e(e) {
            if (e)
              for (var t = 0; t < e.length; t++) {
                var n = e[t];
                n.priority = t + 1;
              }
          }
          function t(e) {
            e.sort(function (e, t) {
              return e.priority - t.priority;
            });
          }
          var n = this;
          (this.$onInit = function () {
            n.questionResponse.priorityList || (n.questionResponse.priorityList = []),
              (n.idToItem = {}),
              t(n.questionResponse.priorityList),
              (n.availableItems = []),
              n.question.priorityList.forEach(function (e) {
                n.idToItem[e.id] = e;
                var t = n.questionResponse.priorityList.some(function (t) {
                  return e.id == t.id;
                });
                t || n.availableItems.push({ priority: null, id: e.id });
              }),
              (n.allItemsOrdered = 0 == n.availableItems.length || null);
            var r = { disabled: n.readOnly, ghostClass: "beingDragged" };
            (n.orderedConfig = angular.extend({}, r, {
              group: { name: "A", pull: !1, put: ["B"] },
              onEnd: function (t, r) {
                e(n.questionResponse.priorityList);
              }
            })),
              (n.availableConfig = angular.extend({}, r, {
                sort: !1,
                group: { name: "B", pull: ["A"], put: !1 },
                onEnd: function (t, r) {
                  e(n.questionResponse.priorityList), (n.allItemsOrdered = 0 == n.availableItems.length || null);
                }
              }));
          }),
            1 === angular.version.major && angular.version.minor < 5 && this.$onInit();
        },
        link: function (e, t, n, r) {
          var s = e.ctrl;
          s.print = r.print;
        }
      };
    }),
    angular.module("mwFormViewer").directive("mwFormViewer", [
      "$rootScope",
      function (e) {
        return {
          replace: !0,
          restrict: "AE",
          scope: {
            formData: "=",
            responseData: "=",
            templateData: "=?",
            readOnly: "=?",
            options: "=?",
            formStatus: "=?",
            onSubmit: "&",
            api: "=?"
          },
          templateUrl: "mw-form-viewer.html",
          controllerAs: "ctrl",
          bindToController: !0,
          controller: [
            "$timeout",
            "$interpolate",
            function (t, n) {
              function r() {
                s.formData.pages.sort(function (e, t) {
                  return e.number - t.number;
                });
              }
              var s = this;
              (s.$onInit = function () {
                (s.defaultOptions = { nestedForm: !1, autoStart: !1, disableSubmit: !1 }),
                  (s.options = angular.extend({}, s.defaultOptions, s.options)),
                  (s.submitStatus = "NOT_SUBMITTED"),
                  (s.formSubmitted = !1),
                  r(),
                  (s.pageIdToPage = {}),
                  s.formData.pages.forEach(function (e) {
                    s.pageIdToPage[e.id] = e;
                  }),
                  (s.buttons = {
                    prevPage: { visible: !1, disabled: !1 },
                    nextPage: { visible: !1, disabled: !1 },
                    submitForm: { visible: !1, disabled: !1 }
                  }),
                  s.resetPages(),
                  s.api &&
                    (s.api.reset = function () {
                      for (var e in s.responseData) s.responseData.hasOwnProperty(e) && delete s.responseData[e];
                      (s.buttons.submitForm.visible = !1),
                        (s.buttons.prevPage.visible = !1),
                        (s.buttons.nextPage.visible = !1),
                        (s.currentPage = null),
                        t(s.resetPages, 0);
                    });
              }),
                (s.submitForm = function () {
                  (s.formSubmitted = !0), (s.submitStatus = "IN_PROGRESS"), s.setCurrentPage(null);
                  var e = s.onSubmit();
                  e.then(function () {
                    s.submitStatus = "SUCCESS";
                  })["catch"](function () {
                    s.submitStatus = "ERROR";
                  });
                }),
                (s.setCurrentPage = function (e) {
                  return (
                    (s.currentPage = e),
                    e
                      ? (s.setDefaultNextPage(), void s.initResponsesForCurrentPage())
                      : ((s.buttons.submitForm.visible = !1),
                        (s.buttons.prevPage.visible = !1),
                        void (s.buttons.nextPage.visible = !1))
                  );
                }),
                (s.setDefaultNextPage = function () {
                  var e = s.formData.pages.indexOf(s.currentPage);
                  if (
                    ((s.currentPage.isFirst = 0 == e),
                    (s.currentPage.isLast = e == s.formData.pages.length - 1),
                    (s.buttons.submitForm.visible = s.currentPage.isLast),
                    (s.buttons.prevPage.visible = !s.currentPage.isFirst),
                    (s.buttons.nextPage.visible = !s.currentPage.isLast),
                    s.currentPage.isLast ? (s.nextPage = null) : (s.nextPage = s.formData.pages[e + 1]),
                    s.currentPage.pageFlow)
                  ) {
                    var t = !1;
                    s.currentPage.pageFlow.formSubmit
                      ? ((s.nextPage = null), (t = !0))
                      : s.currentPage.pageFlow.page
                      ? ((s.nextPage = s.pageIdToPage[s.currentPage.pageFlow.page.id]), (s.buttons.nextPage.visible = !0))
                      : s.currentPage.isLast && ((s.nextPage = null), (t = !0)),
                      (s.buttons.submitForm.visible = t),
                      (s.buttons.nextPage.visible = !t);
                  }
                }),
                (s.initResponsesForCurrentPage = function () {
                  s.currentPage.elements.forEach(function (e) {
                    var t = e.question;
                    t && !s.responseData[t.id] && (s.responseData[t.id] = {});
                  });
                }),
                (s.beginResponse = function () {
                  s.formData.pages.length > 0 &&
                    (s.setCurrentPage(s.formData.pages[0]),
                    e.$broadcast("mwForm.pageEvents.pageCurrentChanged", { currentPage: s.currentPage }));
                }),
                (s.resetPages = function () {
                  (s.prevPages = []),
                    (s.currentPage = null),
                    (s.nextPage = null),
                    (s.formSubmitted = !1),
                    s.options.autoStart && s.beginResponse();
                }),
                (s.goToPrevPage = function () {
                  var t = s.prevPages.pop();
                  s.setCurrentPage(t),
                    s.updateNextPageBasedOnAllAnswers(),
                    e.$broadcast("mwForm.pageEvents.pageCurrentChanged", { currentPage: s.currentPage });
                }),
                (s.goToNextPage = function () {
                  s.prevPages.push(s.currentPage),
                    s.updateNextPageBasedOnAllAnswers(),
                    s.setCurrentPage(s.nextPage),
                    e.$broadcast("mwForm.pageEvents.pageCurrentChanged", { currentPage: s.currentPage });
                }),
                (s.updateNextPageBasedOnAllAnswers = function () {
                  s.currentPage.elements.forEach(function (e) {
                    s.updateNextPageBasedOnPageElementAnswers(e);
                  }),
                    (s.buttons.submitForm.visible = !s.nextPage),
                    (s.buttons.nextPage.visible = !!s.nextPage);
                }),
                (s.updateNextPageBasedOnPageElementAnswers = function (e) {
                  var t = e.question;
                  t &&
                    t.pageFlowModifier &&
                    t.offeredAnswers.forEach(function (e) {
                      e.pageFlow &&
                        s.responseData[t.id].selectedAnswer == e.id &&
                        (e.pageFlow.formSubmit
                          ? (s.nextPage = null)
                          : e.pageFlow.page && (s.nextPage = s.pageIdToPage[e.pageFlow.page.id]));
                    });
                }),
                (s.onResponseChanged = function (e) {
                  s.setDefaultNextPage(), s.updateNextPageBasedOnAllAnswers();
                }),
                (s.print = function (e) {
                  return e && s.templateData ? n(e)(s.templateData) : e;
                }),
                1 === angular.version.major && angular.version.minor < 5 && s.$onInit();
            }
          ],
          link: function (t, n, r) {
            var s = t.ctrl;
            s.formStatus && (s.formStatus.form = s.form),
              t.$on("mwForm.pageEvents.changePage", function (t, n) {
                if ("undefined" != typeof n.page && n.page < s.formData.pages.length) {
                  s.resetPages();
                  for (var r = 0; r < n.page; r++) s.prevPages.push(s.formData.pages[r]);
                  var o = s.formData.pages[n.page];
                  s.setCurrentPage(o),
                    e.$broadcast("mwForm.pageEvents.pageCurrentChanged", { currentPage: o }),
                    s.updateNextPageBasedOnAllAnswers();
                }
              });
          }
        };
      }
    ]),
    angular
      .module("mwFormViewer")
      .factory("FormQuestionId", function () {
        var e = 0;
        return {
          next: function () {
            return ++e;
          }
        };
      })
      .directive("mwFormQuestion", function () {
        return {
          replace: !0,
          restrict: "AE",
          require: "^mwFormViewer",
          scope: { question: "=", questionResponse: "=", readOnly: "=?", options: "=?", onResponseChanged: "&?" },
          templateUrl: "mw-form-question.html",
          controllerAs: "ctrl",
          bindToController: !0,
          controller: [
            "$timeout",
            "FormQuestionId",
            function (e, t) {
              var n = this;
              (this.$onInit = function () {
                (n.id = t.next()),
                  "radio" == n.question.type
                    ? (n.questionResponse.selectedAnswer || (n.questionResponse.selectedAnswer = null),
                      n.questionResponse.other && (n.isOtherAnswer = !0))
                    : "checkbox" == n.question.type
                    ? (n.questionResponse.selectedAnswers && n.questionResponse.selectedAnswers.length
                        ? (n.selectedAnswer = !0)
                        : (n.questionResponse.selectedAnswers = []),
                      n.questionResponse.other && (n.isOtherAnswer = !0))
                    : "grid" == n.question.type
                    ? n.question.grid.cellInputType || (n.question.grid.cellInputType = "radio")
                    : "division" == n.question.type
                    ? ((n.computeDivisionSum = function () {
                        (n.divisionSum = 0),
                          n.question.divisionList.forEach(function (e) {
                            0 == n.questionResponse[e.id] || n.questionResponse[e.id]
                              ? (n.divisionSum += n.questionResponse[e.id])
                              : ((n.questionResponse[e.id] = null), (n.divisionSum += 0));
                          });
                      }),
                      n.computeDivisionSum())
                    : ("date" != n.question.type && "datetime" != n.question.type && "time" != n.question.type) ||
                      (n.questionResponse.answer && (n.questionResponse.answer = new Date(n.questionResponse.answer))),
                  (n.isAnswerSelected = !1),
                  (n.initialized = !0);
              }),
                (n.selectedAnswerChanged = function () {
                  delete n.questionResponse.other, (n.isOtherAnswer = !1), n.answerChanged();
                }),
                (n.otherAnswerRadioChanged = function () {
                  void 0, n.isOtherAnswer && (n.questionResponse.selectedAnswer = null), n.answerChanged();
                }),
                (n.otherAnswerCheckboxChanged = function () {
                  n.isOtherAnswer || delete n.questionResponse.other,
                    (n.selectedAnswer = !(!n.questionResponse.selectedAnswers.length && !n.isOtherAnswer) || null),
                    n.answerChanged();
                }),
                (n.toggleSelectedAnswer = function (e) {
                  n.questionResponse.selectedAnswers.indexOf(e.id) === -1
                    ? n.questionResponse.selectedAnswers.push(e.id)
                    : n.questionResponse.selectedAnswers.splice(n.questionResponse.selectedAnswers.indexOf(e.id), 1),
                    (n.selectedAnswer = !(!n.questionResponse.selectedAnswers.length && !n.isOtherAnswer) || null),
                    n.answerChanged();
                }),
                (n.answerChanged = function () {
                  n.onResponseChanged && n.onResponseChanged();
                }),
                1 === angular.version.major && angular.version.minor < 5 && this.$onInit();
            }
          ],
          link: function (e, t, n, r) {
            var s = e.ctrl;
            s.print = r.print;
          }
        };
      }),
    angular.module("mwFormViewer").directive("mwFormConfirmationPage", function () {
      return {
        replace: !0,
        restrict: "AE",
        require: "^mwFormViewer",
        scope: { submitStatus: "=", confirmationMessage: "=", readOnly: "=?" },
        templateUrl: "mw-form-confirmation-page.html",
        controllerAs: "ctrl",
        bindToController: !0,
        controller: function () {},
        link: function (e, t, n, r) {
          var s = e.ctrl;
          s.print = r.print;
        }
      };
    });
  angular.module("mwFormViewer").run([
    "$templateCache",
    function (e) {
      e.put(
        "mw-form-confirmation-page.html",
        "<div class=mw-form-confirmation-page><div class=mw-confirmation-message ng-if=\"ctrl.submitStatus=='SUCCESS'\"><span ng-if=ctrl.confirmationMessage>{{::ctrl.print(ctrl.confirmationMessage)}}</span> <span ng-if=!ctrl.confirmationMessage translate=mwForm.confirmationPage.defaultMessage>Twoja odpowiedÅº zostaÅ‚a zapisana</span></div><div class=mw-error-message ng-if=\"ctrl.submitStatus=='ERROR'\"><span translate=mwForm.confirmationPage.errorMessage>BÅ‚ad. Twoja odpowiedÅº nie zostaÅ‚a zapisana.</span></div><div class=mw-pending-message ng-if=\"ctrl.submitStatus=='IN_PROGRESS'\"><span translate=mwForm.confirmationPage.pendingMessage>Zapisywanie odpowiedzi w trakcie.</span></div></div>"
      ),
        e.put(
          "mw-form-question.html",
          '<div class=mw-form-question><div class=mw-question-text>{{::ctrl.print(ctrl.question.text)}} <span ng-if=ctrl.question.required>*</span></div><div class=mw-question-answers ng-switch=ctrl.question.type><div ng-switch-when=text><input class=form-control type=text ng-model=ctrl.questionResponse.answer placeholder="{{\'mwForm.question.preview.text\'|translate}}" ng-required=ctrl.question.required ng-readonly=ctrl.readOnly></div><div ng-switch-when=textarea><textarea msd-elastic class=form-control ng-model=ctrl.questionResponse.answer placeholder="{{\'mwForm.question.preview.textarea\'|translate}}" ng-required=ctrl.question.required ng-readonly=ctrl.readOnly></textarea></div><div ng-switch-when=radio><div class=radio ng-repeat="answer in ctrl.question.offeredAnswers"><label><input type=radio ng-model=ctrl.questionResponse.selectedAnswer ng-value=answer.id name=answer-for-question-{{ctrl.question.id}} ng-change=ctrl.selectedAnswerChanged() ng-required="ctrl.question.required &&!ctrl.isOtherAnswer" ng-disabled=ctrl.readOnly> {{::ctrl.print(answer.value)}}</label></div><div class=radio ng-if=ctrl.question.otherAnswer><label><input type=radio ng-model=ctrl.isOtherAnswer ng-value=true name=other-answer-for-question-{{ctrl.question.id}} ng-change=ctrl.otherAnswerRadioChanged() ng-disabled=ctrl.readOnly><span translate=mwForm.question.preview.otherAnswer>Inna</span>:</label> <span class=form-inline><input type=text name=other-answer-for-question-{{ctrl.question.id}} ng-model=ctrl.questionResponse.other class=form-control ng-disabled="!ctrl.isOtherAnswer || ctrl.readOnly" ng-required=ctrl.isOtherAnswer></span></div></div><div ng-switch-when=checkbox><div class=checkbox ng-repeat="answer in ::ctrl.question.offeredAnswers"><label><input type=checkbox name=answer-for-question-{{ctrl.question.id}} ng-checked="ctrl.questionResponse.selectedAnswers.indexOf(answer.id) != -1" ng-click=ctrl.toggleSelectedAnswer(answer) ng-disabled=ctrl.readOnly> {{::ctrl.print(answer.value)}}</label></div><div class=checkbox ng-if=ctrl.question.otherAnswer><label><input type=checkbox name=answer-for-question-{{ctrl.question.id}} ng-model=ctrl.isOtherAnswer ng-change=ctrl.otherAnswerCheckboxChanged() ng-disabled=ctrl.readOnly><span translate=mwForm.question.preview.otherAnswer>Inna</span>:</label> <span class=form-inline><input type=text ng-model=ctrl.questionResponse.other name=other-answer-for-question-{{ctrl.question.id}} class=form-control ng-disabled="!ctrl.isOtherAnswer || ctrl.readOnly" ng-required=ctrl.isOtherAnswer></span></div><input type=hidden ng-model=ctrl.selectedAnswer ng-required="ctrl.question.required &&!ctrl.isOtherAnswer"></div><div ng-switch-when=select><select ng-options="answer.id as ctrl.print(answer.value) for answer in ::ctrl.question.offeredAnswers" ng-model=ctrl.questionResponse.selectedAnswer class=form-control ng-disabled=ctrl.readOnly ng-required=ctrl.question.required></select></div><div ng-switch-when=grid><div class=table-responsive><table class="table table-condensed table-striped" border=0 cellpadding=5 cellspacing=0><thead><tr><td></td><td ng-repeat="col in ::ctrl.question.grid.cols"><label>{{::ctrl.print(col.label)}}</label></td></tr></thead><tbody><tr ng-repeat="row in ::ctrl.question.grid.rows"><td>{{::ctrl.print(row.label)}}</td><td ng-repeat="col in ::ctrl.question.grid.cols" ng-switch=ctrl.question.grid.cellInputType><input ng-switch-when=radio type=radio ng-model=ctrl.questionResponse[row.id] ng-value=col.id name=answer-for-question-{{row.id}} ng-required=ctrl.question.required ng-disabled=ctrl.readOnly> <input ng-switch-when=checkbox type=checkbox ng-model=ctrl.questionResponse[row.id][col.id] name=answer-for-question-{{row.id}}-{{col.id}} ng-required=ctrl.question.required ng-disabled=ctrl.readOnly> <input ng-switch-default ng-attr-type={{ctrl.question.grid.cellInputType}} ng-model=ctrl.questionResponse[row.id][col.id] name=answer-for-question-{{row.id}}-{{col.id}} ng-required=ctrl.question.required ng-disabled=ctrl.readOnly ng-class="\'form-control\'"></td></tr></tbody></table></div></div><div ng-switch-when=division class=division-list ng-form=ctrl.divisionForm><div class=form-inline style="margin-bottom: 5px" ng-repeat="item in ctrl.question.divisionList"><div class=form-group><label>{{::ctrl.print(item.value)}}</label> <input type=number class=form-control ng-model=ctrl.questionResponse[item.id] min=0 max={{ctrl.question.quantity}} required style="width: 80px" ng-change=ctrl.computeDivisionSum() ng-readonly=ctrl.readOnly> <span>{{::ctrl.print(ctrl.question.unit)}}</span></div></div><div class=form-inline style="margin-bottom: 5px"><div class=form-group><label translate=mwForm.question.division.assignedSumLabel>Przydzielono</label> <input type=number class="form-control strict-validation" ng-model=ctrl.divisionSum min={{ctrl.question.quantity}} max={{ctrl.question.quantity}} style="width: 80px" readonly> <span>{{ctrl.question.unit}} <span translate=mwForm.question.division.fromRequiredLabel>z wymaganych</span> <strong>{{ctrl.question.quantity}}</strong> {{ctrl.question.unit}} <i ng-show=ctrl.divisionForm.$valid class="fa fa-check" style=color:#008000;></i></span></div></div></div><mw-priority-list ng-switch-when=priority question-response=ctrl.questionResponse question=ctrl.question read-only=ctrl.readOnly></mw-priority-list><div ng-switch-when=number class=form-inline><input class=form-control min={{ctrl.question.min}} max={{ctrl.question.max}} type=number ng-model=ctrl.questionResponse.answer ng-required=ctrl.question.required ng-readonly=ctrl.readOnly></div><div ng-switch-when=date class=form-inline><input class=form-control type=date ng-model=ctrl.questionResponse.answer ng-required=ctrl.question.required ng-readonly=ctrl.readOnly></div><div ng-switch-when=datetime class=form-inline><input class=form-control type=datetime ng-model=ctrl.questionResponse.answer ng-required=ctrl.question.required ng-readonly=ctrl.readOnly></div><div ng-switch-when=time class=form-inline><input class=form-control type=time ng-model=ctrl.questionResponse.answer ng-required=ctrl.question.required ng-readonly=ctrl.readOnly></div><div ng-switch-when=email class=form-inline><input class=form-control type=email ng-model=ctrl.questionResponse.answer ng-required=ctrl.question.required ng-readonly=ctrl.readOnly></div><div ng-switch-when=range class=mw-range><input ng-attr-min={{ctrl.question.min}} ng-attr-max={{ctrl.question.max}} type=range ng-model=ctrl.questionResponse.answer ng-required=ctrl.question.required ng-readonly=ctrl.readOnly><strong class=mw-range-value-label>{{ctrl.questionResponse.answer}}</strong></div><div ng-switch-when=url class=form-inline><input class=form-control type=url ng-model=ctrl.questionResponse.answer ng-required=ctrl.question.required ng-readonly=ctrl.readOnly></div></div></div>'
        ),
        e.put(
          "mw-form-viewer-content.html",
          '<div class=mw-form-viewer-content><h1 class=form-title>{{ctrl.formData.name}}</h1><div class=mw-title-page ng-if="!ctrl.currentPage && !ctrl.formSubmitted"><div class=mw-form-description>{{ctrl.formData.description}}</div><button type=button class="btn btn-default begin-response-button" ng-click=ctrl.beginResponse() translate=mwForm.buttons.begin>Rozpocznij</button></div><div class=mw-form-page ng-if=ctrl.currentPage><h2 class=mw-page-title ng-if="ctrl.currentPage.namedPage && ctrl.currentPage.name">{{ctrl.currentPage.name}}</h2><div class=mw-form-page-element-list><div class=mw-page-element ng-repeat="pageElement in ctrl.currentPage.elements" ng-switch=pageElement.type><mw-form-question ng-switch-when=question question=pageElement.question question-response=ctrl.responseData[pageElement.question.id] read-only=ctrl.readOnly on-response-changed=ctrl.onResponseChanged(pageElement)></mw-form-question><div class=image-element ng-switch-when=image><figure ng-class="\'align-\'+pageElement.image.align"><img ng-src={{pageElement.image.src}} ng-attr-alt=pageElement.image.caption><figcaption ng-if=pageElement.image.caption>{{pageElement.image.caption}}</figcaption></figure></div><div ng-switch-when=paragraph><p ng-bind-html=::ctrl.print(pageElement.paragraph.html)></p></div></div></div></div><mw-form-confirmation-page ng-if=ctrl.formSubmitted confirmation-message=ctrl.formData.confirmationMessage submit-status=ctrl.submitStatus></mw-form-confirmation-page><div class=mw-form-action-list><button type=button ng-if=ctrl.buttons.prevPage.visible class="btn btn-default prev-page-button" ng-click=ctrl.goToPrevPage()><i class="fa fa-chevron-left"></i> <span translate=mwForm.buttons.back>Wstecz</span></button> <button type=button ng-disabled=ctrl.form.$invalid ng-if=ctrl.buttons.nextPage.visible class="btn btn-default next-page-button" ng-click=ctrl.goToNextPage()><span translate=mwForm.buttons.next>Dalej</span> <i class="fa fa-chevron-right"></i></button> <button type=submit ng-disabled="ctrl.options.disableSubmit || ctrl.form.$invalid" ng-if="ctrl.buttons.submitForm.visible && !ctrl.readOnly" class="btn btn-default next-page-button" ng-click=ctrl.submitForm()><span translate=mwForm.buttons.submit>Submit</span></button></div></div>'
        ),
        e.put(
          "mw-form-viewer.html",
          "<div class=mw-form-viewer><form ng-if=!ctrl.options.nestedForm name=ctrl.form role=form novalidate ng-include=\"'mw-form-viewer-content.html'\"></form><div ng-if=ctrl.options.nestedForm ng-form=ctrl.form ng-include=\"'mw-form-viewer-content.html'\"></div></div>"
        ),
        e.put(
          "mw-priority-list.html",
          '<div class=mw-priority-list><table><thead><tr><th translate=mwForm.question.priority.sorted>Sorted</th><th translate=mwForm.question.priority.available>Available</th></tr></thead><tbody><tr><td class=mw-ordered-items ng-sortable=ctrl.orderedConfig ng-model=ctrl.questionResponse.priorityList><div class=mw-item ng-repeat="item in ctrl.questionResponse.priorityList"><strong>{{$index+1}}.</strong> {{::ctrl.print(ctrl.idToItem[item.id].value)}}</div></td><td class=mw-available-items ng-sortable=ctrl.availableConfig ng-model=ctrl.availableItems><div class=mw-item ng-repeat="item in ctrl.availableItems">{{::ctrl.print(ctrl.idToItem[item.id].value)}}</div></td></tr></tbody></table><input type=hidden ng-model=ctrl.allItemsOrdered ng-required=ctrl.question.required></div>'
        );
    }
  ]);
  (function () {
    angular
      .module("PdfApp", ["mwFormViewer"])
      .config([
        "$translateProvider",
        function ($translateProvider) {
          $translateProvider.useSanitizeValueStrategy("sanitize");
          $translateProvider.preferredLanguage("en");
          $translateProvider.translations("en", {
            mwForm: {
              question: {
                preview: {
                  text: "",
                  textarea: ""
                }
              }
            }
          });
        }
      ])
      .controller("FormViewerController", [
        "$scope",
        "$interval",
        function ($scope, $interval) {
          var pdf_interval;
          pdf_interval = $interval(function () {
            var test, textAreas, textInputs;
            test = document.getElementById("test");
            test.innerHTML += " test";
            textInputs = document.querySelectorAll(".mw-form-viewer .mw-question-answers input[type=text]");
            if (!textInputs) {
              return;
            }
            angular.forEach(textInputs, function (input) {
              var $input;
              $input = angular.element(input);
              $input.after("<textarea class='form-control'>" + $input.val() + "</textarea>");
              input.style.display = "none";
            });
            textAreas = document.querySelectorAll(".question-item textarea");
            angular.forEach(textAreas, function (element) {
              var height;
              if (element.scrollHeight) {
                height = element.scrollHeight + 5;
                element.style.height = height + "px";
              }
            });
            $interval.cancel(pdf_interval);
          }, 1000);
        }
      ]);
  }.call(this));
  