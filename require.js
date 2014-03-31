/**
 * @file Implementation require for XScript and client-side.
 * @author Vlad Kurkin <b-vladi@yandex-team.ru>
 * @version 2.2
 * @license <a href="https://github.com/appendto/amplify/blob/master/MIT-LICENSE.txt">MIT</a>
 */

/**
 * @description
 * Кастомная реализация функции require для CommonJS-модулей с поддержкой окружений XScript и Client-side.
 * <br />Алгоритм работы require:
 * <br /><img src="../uml/Work.png" />
 * <br />Require поддерживает рекурсивную загрузку модулей при условии соблюдения правил написания кода:
 * <ul>
 *     <li>
 *       Свойство {@link Module#exports} модуля, который рекурсивно загружает сам себя (явно или из цепочки вызовов require, инициализированной из этого модуля), не должно перезаписываться. Вместо этого следует добавлять свойства непосредственно в нативный объект {@link Module#exports}.
 *     </li>
 *     <li>
 *         Модуль "A", вызвающий модуль "B" (который уже выполняется выше модуля "A" в стеке вызовов), не должен использовать API модуля "B" непосредственно после вызова require в текущем контексте выполнения, так как к этому моменту объект {@link Module#exports} модуля "B" ещё не инициализирован.
 *     </li>
 * </ul>
 * <br />Пример рекурсивного запроса модулей ниже.<br />
 * <br />Схема наследования модулей:
 * <br /><img src="../uml/Inherit.png" />
 * @param {String} namespace Пространство имен модуля или путь к JavaScript-файлу. Пространство имен представляет собой строку имён, разделённых точкой. Имя должно начинаться с буквы, затем могут идти символы латинского алфавита, а так же знаки "-" и "_". Если переданный аргумент не является пространством имен, он воспринимается как путь к файлу, по которому следует загрузить модуль.
 * @tutorial README
 * @function require
 * @global
 * @throws {require.Error} Ошибка получения модуля.
 * @return {Object} Объект {@link Module#exports}.
 * @property {Array} [path=[]] Массив путей с директориями, в которых будут искаться файлы модулей на серверной стороне. Каждый путь представляет собой уровень переопределения, выстраивающий соответствующую цепочку наследования модулей из одного пространства имен (см. схему наследования).
 * @property {String} [extension='js'] Расширение файлов модулей. Подробнее: {@link Module#load}.
 * @property {String} [packageName='package.json'] Имя JSON-файла, содержащий информацию о модуле. В данный момент используется только свойство main. Подробнее: {@link Module#load}.
 * @property {Object} [file=xscript.file] API XScript-а для работы с файловой системой. Существует только на серверной стороне.
 * @property {Object} proto Общий прототип объектов ({@link Module#exports}) (см. схему наследования).
 * @property {Function} define(namespace,wrapper) Регистрирует модуль по указанному пространству имен в первом параметре. Вторым параметром должена быть функция, которая принимает 4 аргумента (см. {@link Module#compile}) и содержит в себе тело модуля. Вызов метода {@link require}.define не инициализирует модуль (функция wrapper не вызывается). Инициализация происходит в момент первого обращения к модулю через вызов require. Все аргументы обязательны.
 * @property {Object} cache Ссылка на глобальное пространство имен. В этот объект сохраняются ссылки на все созданные модули в рамках текущего require и его детей. Этот объект может быть переопределён в коде модуля.
 * @property {String} [namespace=null] Имя, по которому будет доступен объект {@link require.global} из глобального объекта окружения (window, global). Require самостоятельно не сохраняет объект {@link require.global} в глобальном объекте, для этого вы должны использовать метод {@link require.setModuleNameSpace}.
 * @property {Function} setModuleNameSpace([name=require.namespace]) Сохраняет объект {@link require.global} в глобольный объект окружения по указанному имени. В случае успеха возвращает true, иначе false.
 * @property {Function} [top=require] Ссылка на функцию {@link require} верхнего уровня. Модули, инициализируемые этой функцией, не будут иметь предка, если вызов был из другого модуля.
 * @property {Function} Error(message,error) Конструктор ошибки загрузки модуля.
 * @example
 * // Загрузка модуля из разных уровней переопределения:
 * require.path = ['/path/to/first/dir/', './path/to/second/dir'];
 * require('name.space');
 * // В этом случае объект {@link Module#exports}, из модуля "path/to/second/dir/names.space.js",
 * // будет наследовать от объекта {@link Module#exports}, из модуля "/path/to/first/dir/names.space.js".
 *
 * // Доступ к модулям из глобального пространства имен:
 * require('some.name.space');
 * XM.some.name.space;// TypeError: объект XM не найден в глобальном объекте.
 * // Имя можно регистрировать и после вызова require
 * require.setModuleNameSpace('XM');
 * XM.some.name.space; // объект {@link Module#exports}.
 *
 * // Регистрация модуля в браузере:
 * require.define('name.space', function (module, exports, require, basedir, global) {
 *     // Тело модуля
 * });
 *
 * // Пример рекурсивного вызова модулей:
 * // Вызов модуля из глобального контекста:
 * var A = require('A');
 * // Рекурсии нет, выполнение продолжается
 *
 * // Код модуля "A":
 * var B = require('B');
 *
 * // Записываем свойство в нативный {@link Module#exports}
 * this.field = 'value';
 *
 * // Код модуля "B":
 * // Рекурсивный вызов модуля "A"
 * var A = require('A');
 *
 * A.field; // undefined, модуль ещё не инициализирован.
 *
 * this.method = function () {
 *     //
 *     return A.field; // 'value'
 * }
 */
var require = (function (global) {
    var
        MODULE_CACHE = {},
        WRAPPER_CACHE = {},
        STACK = [],
        NSRegExp = /^([a-z]+[a-z\-_]*)(?:\.[a-z]+[a-z\-_]*)*$/i,
        parent = null,
        undefined;

    global = new Function('return this;')() || this || global;

    /**
     * Конструктор объекта модуля. Структура создаваемых экземпляров отличается от спецификации CommonJS.
     * @summary <img src="../uml/Module.png" alt="" />
     * @name Module
     * @constructor
     * @private
     * @param {String} [namespace=undefined] Пространство имен модуля.
     * @param {String} [path=undefined] Путь к файлу или дирректории, по которому он будет загружен.
     * @throws {require.Error} Ошибка создания модуля.
     */
    function Module(namespace, path) {
        parent && parent.children.push(this);

        /**
         * Функция загрузки модуля, аналогична {@link require}.
         * @param {String} namespace См. {@link require}.
         * @name Module#require
         * @method
         */
        this.require = requireFactory(this);

        /**
         * Реализация модуля, являющаяся его внешним API. По-умолчанию этот объект наследует от {@link Module#proto}. Для того, что бы разорвать наследование между уровнями переопределения, достаточно заменить значение этого свойства (см. диаграмму наследования).
         * @name Module#exports
         * @type {Object}
         */
        this.exports = new Exports();

        /**
         * Ссылка на прототип объекта {@link Module#exports}. Концом цепочки наследования является {@link require}.proto, если не было переопределено свойство {@link Module#exports} на каком-либо уровне переопределения.
         * @name Module#proto
         * @type {Object}
         * @example
         * // Исходный код модуля, находящегося на втором уровне переопределения.
         * // Перекрытие наследуемого метода.
         * this.log = function (string) {
         *   // Вызов исходного метода
         *   return module.proto.log('[LOG]: ' + string);
         * }
         */
        this.proto = Exports.prototype;

        /**
         * Ссылка на JSON-объект, загруженный из {@link require}.packageName.
         * @name Module#package
         * @default null
         * @type {Object}
         */
        this['package'] = null;

        /**
         * Пространство имен модуля.
         * @name Module#namespace
         * @default undefined
         * @type {String}
         */
        this.namespace = namespace;

        /**
         * Ссылка на объект модуля, который инициализировал текущий.
         * @name Module#parent
         * @default null
         * @type {Module}
         * @example
         * // Загрузка подмодуля
         * this.foo = 'bar';
         * var submodule = require(basedir + 'submodule.js');
         *
         * // Доступ к API родителя из submodule.js
         * module.parent.exports.foo // bar
         */
        this.parent = parent;

        /**
         * Массив модулей, загруженный из текущего модуля.
         * @since 2.2
         * @name Module#children
         * @type {Array}
         */
        this.children = [];

        /**
         * Исходный код модуля.
         * @name Module#source
         * @type {String}
         * @default ''
         */
        this.source = '';

        /**
         * Путь к файлу модуля.
         * @name Module#path
         * @type {String}
         * @default ''
         */
        this.path = '';

        /**
         * Имя файла модуля.
         * @since 1.6
         * @name Module#filename
         * @type {String}
         * @default ''
         */
        this.filename = '';

        /**
         * Путь к папке, из которой был загружен модуль.
         * @name Module#basedir
         * @type {String}
         * @default ''
         */
        this.basedir = '';

        /**
         * Флаг состояния загрузки модуля.
         * @since 1.6
         * @name Module#loaded
         * @type {Boolean}
         * @default false
         */
        this.loaded = false;

        parent = null;

        if (path) {
            this.init(this.load(path).compile());
        }
    }

    /**
     * Конструктор объекта {@link Module#exports}.
     * @static
     * @type {Exports}
     * @memberOf Module
     */
    Module.Exports = Exports;

    /**
     * Загружает код модуля из папки dir на серверной стороне. Поиск кода осуществляется последовательно в местах:
     *
     * Если модуль имеет пространство имён:
     * <ul>
     *   <li>Ищется папка с именем пространства имён.</li>
     *   <li>Если папка найдена, в ней ищется JSON-файл с именем, указанным в {@link require}.packageName.</li>
     *   <li>Если JSON-файл найден и в нем определено свойство main с именем входного файла, ищется указанный файл в текущей папке.</li>
     *   <li>Если JSON-файл отсутствует, в текущей папке ищется файл, имя которого совпадает с пространством имен модуля с расширением, указанным в {@link require}.extension.</li>
     * </ul>
     * Если пространство имен не указано, код загружается по указанному пути.
     * <br /><br />Таким образом, файловая структура модуля c установленным namespace может представлять собой (в порядке приоритета):
     * <ol>
     *   <li>namespace/<br />&nbsp;&nbsp;package.json ({"main": "main.js"})<br />&nbsp;&nbsp;main.js</li>
     *   <li>namespace/<br />&nbsp;&nbsp;namespace.js</li>
     *   <li>namespace.js</li>
     * </ol>
     * <br /><br />
     * Схема алгоритма поиска модуля:
     * <br /><img src="../uml/Load.png" />
     * <p>
     *     <b>TODO:</b> реализовать поддержку загрузки по URL из браузера.
     * </p>
     * @param {String} dir Путь к файлу или дирректории.
     * @return {Module}
     * @memberOf Module
     * @this Module
     * @throws {Error|require.Error} Ошибка загрузки кода.
     */
    Module.prototype.load = function (dir) {
        var
            PATH_TO_FILE = 1,
            PATH_TO_PACKAGE = 2,
            PATH_TO_DIR = 3,
            PATH_TO_MAIN = 4;

        var
            namespace = this.namespace,
            require = this.require,
            path = dir,
            state;

        if (dir.substr(-1) !== '/') {
            dir += '/';
        }

        if (typeof namespace === 'string' && namespace !== '') {
            dir += namespace;
            path = dir;
            state = PATH_TO_DIR;
        } else {
            state = PATH_TO_FILE;
        }

        while (true) {
            if (require.file.test(path)) {
                switch (state) {
                    case PATH_TO_DIR:
                        path = dir + require.packageName;
                        state = PATH_TO_PACKAGE;
                        break;

                    case PATH_TO_PACKAGE:
                        try {
                            this['package'] = require.file.load(path);
                        } catch (error) {
                            throw new RequireError('Can`t load JSON file: "' + path + '".', error);
                        }

                        try {
                            this['package'] = JSON.parse(stripBOM(this['package']));
                        } catch (error) {
                            throw new RequireError('Can`t parse JSON file: "' + path + '".', error);
                        }

                        path = dir + '/' + (this['package'].hasOwnProperty('main') ? this['package'].main : namespace + '.' + require.extension);
                        state = PATH_TO_MAIN;
                        break;

                    default:
                        try {
                            this.source = require.file.load(path);
                        } catch (error) {
                            throw new RequireError('Can`t load module file: "' + path + '".', error);
                        }

                        this.source = stripBOM(this.source);
                        this.path = path;
                        this.basedir = path.substring(0, path.lastIndexOf('/') + 1);
                        this.filename = path.substr(path.lastIndexOf('/'));
                        this.loaded = true;

                        return this;
                }
            } else {
                switch (state) {
                    case PATH_TO_DIR:
                        path = dir + '.' + require.extension;
                        state = PATH_TO_FILE;
                        break;

                    case PATH_TO_PACKAGE:
                        path = dir + '/' + namespace + '.' + require.extension;
                        state = PATH_TO_FILE;
                        break;

                    case PATH_TO_MAIN:
                        throw new RequireError('Can`t find main file: "' + path + '".');
                        break;

                    case PATH_TO_FILE:
                        throw 'Cant find module';
                        break;
                }
            }
        }
    };

    /**
     * Компилирует модуль в функцию и возвращает её в качестве результата. В локальной области видимости созданной функции доступны следующие переменные:
     * <pre>
     * <b>module</b> - ссылка на объект модуля {@link Module}.
     * <b>exports</b> - ссылка на объект {@link Module#exports}.
     * <b>require</b> - ссылка на метод {@link Module#require}.
     * <b>basedir</b> - значение свойства {@link Module#basedir}.
     * <b>global</b> - глобальный объект окружения (window, global).
     * </pre>
     * @param {String} [source=Module#source] Исходный код модуля.
     * @return {Function} Скомпилированная функция-обертка модуля.
     * @throws {require.Error} Ошибка компиляции с указанием причины.
     * @this Module
     * @memberOf Module
     */
    Module.prototype.compile = function (source) {
        if (typeof source === 'string') {
            this.source = source;
        }

        try {
            return new Function('module', 'exports', 'require', 'basedir', 'global', this.source);
        } catch (error) {
            throw new RequireError('Compilation error module.', error);
        }
    };

    /**
     * Инициализирует модуль. Код модуля выполняется в контексте {@link Module#exports}.
     * @param {Function} wrapper Функция, в которой содержится тело модуля.
     * @throws {require.Error} Ошибка инициализации.
     * @returns {Module} Объект {@link Module}.
     * @this Module
     * @memberOf Module
     */
    Module.prototype.init = function (wrapper) {
        var namespace = this.namespace;
        var exports = this.exports;
        var path = this.path || namespace;
        var require = this.require;

        if (namespace) {
            MODULE_CACHE[namespace] = exports;
        }

        STACK.push(path);

        if (typeof wrapper === 'function') {
            try {
                wrapper.call(exports, this, exports, require, this.basedir, global);
            } catch (error) {
                if (!(error instanceof RequireError)) {
                    error = new RequireError('Cant init module "' + path + '".', error);
                }

                throw error;
            }
        } else {
            throw new RequireError('Error initializing module.', 'Wrapper is not a function');
        }

        STACK.pop();

        return this;
    };

    function Exports() {
    }

    function RequireError(message, error) {
        this.stack = null;

        if (error) {
            this.stack = error.stack;
            message += ' Reason: "' + error + '".';
        }

        if (STACK.length) {
            message += ' Module Stack: "' + STACK.join(', ') + '". ';
        }

        this.message = message;

        STACK.length = 0;
    }

    RequireError.prototype = new Error();
    RequireError.prototype.name = RequireError.name;

    function require(namespace) {
        var
            module,
            index = 0,
            current = parent ? parent.require : require,
            pathsLength = current.path.length,
            path;

        if (typeof namespace !== 'string' || namespace === '') {
            throw new RequireError('Namespace must be non-empty string.');
        }

        if (MODULE_CACHE.hasOwnProperty(namespace)) {
            return MODULE_CACHE[namespace];
        }

        Exports.prototype = current.proto;

        if (WRAPPER_CACHE.hasOwnProperty(namespace)) {
            module = new Module(namespace, undefined).init(WRAPPER_CACHE[namespace]);

            createNamespace(module);

            delete WRAPPER_CACHE[namespace];
        } else if (NSRegExp.test(namespace)) {

            while (index < pathsLength) {
                Exports.prototype = module ? module.exports : current.proto;
                path = current.path[index++];

                try {
                    module = new Module(namespace, path);
                } catch (error) {
                    if (error instanceof RequireError) {
                        throw error;
                    }
                }
            }

            if (module) {
                createNamespace(module);
            } else {
                path = pathsLength ? ('in paths: "' + current.path.join(', ') + '"') : '. Add the path in "require.path" or define a module via the "require.define"';
                throw new RequireError('Cant find module "' + namespace + '" ' + path + '.');
            }
        } else {
            try {
                return new Module(undefined, namespace).exports;
            } catch (error) {
                if (!(error instanceof RequireError)) {
                    error = new RequireError('Cant find module in path: "' + namespace + '".');
                }

                throw error;
            }
        }

        MODULE_CACHE[namespace] = module.exports;

        return module.exports;
    }

    require.cache = {};
    require.namespace = null;
    require.path = [];
    require.extension = 'js';
    require.packageName = 'package.json';
    require.proto = Exports.prototype;
    require.top = require;
    require.Error = RequireError;

    try {
        require.file = xscript.file;
    } catch (error) {
        // Other environment.
    }

    require.define = function (namespace, module) {
        if (typeof namespace !== 'string' || namespace === '') {
            throw new RequireError('Module namespace must be a non-empty string.');
        }

        if (!NSRegExp.test(namespace)) {
            throw new RequireError('First argument is not a namespace.');
        }

        if (typeof module !== 'function') {
            throw new RequireError('Module is not a function.');
        }

        WRAPPER_CACHE[namespace] = module;
    };

    require.setModuleNameSpace = function (name) {
        if (typeof name !== 'string' || name == '') {
            return false;
        } else {
            this.namespace = name;
        }

        try {
            global[name] = this.cache;
        } catch (error) {
            // The global object is not defined or readonly, use the {@link require.cache} reference.
            return false;
        }

        return true;
    };

    function requireFactory(module) {
        function wrapper(namespace) {
            parent = module;
            return require(namespace);
        }

        wrapper.namespace = require.namespace;
        wrapper.path = require.path;
        wrapper.extension = require.extension;
        wrapper.packageName = require.packageName;
        wrapper.file = require.file;
        wrapper.define = require.define;
        wrapper.setModuleNameSpace = require.setModuleNameSpace;
        wrapper.cache = require.cache;
        wrapper.proto = require.proto;
        wrapper.name = require.name;
        wrapper.Error = RequireError;
        wrapper.top = require;

        return wrapper;
    }

    function stripBOM(content) {
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
        }

        return content;
    }

    function createNamespace(module) {
        var
            name,
            index = 0,
            namespace = module.namespace.split('.'),
            length = namespace.length,
            cache = module.require.cache;

        while (index < length) {
            name = namespace[index++];

            if (index === length) {
                cache[name] = module.exports;
            } else if (!cache.hasOwnProperty(name)) {
                cache[name] = {};
            }

            cache = cache[name];
        }
    }

    return require;
}(this));

/* @startuml
 * "Save module in cache" as SaveInCache -d-> "Create namespace" as NS
 *
 * (*) --> if "" then
 *   note left: The module is\nin the cache?
 *   -d-> [true] "Return\n<i>module.exports</i>" as Return
 * else
 *   -r-> [false] if "" then
 *     note top: The module is defined?
 *     partition "1. Load from defined" {
 *       --> [true] "<i>new Module(namespace)</i>\n<i>.init(wrapper)</i>"
 *       -d-> SaveInCache
 *     }
 *   else
 *   -r-> [false] if "" then
 *       note top: The first argument\nis the namespace?
 *
 *       partition "2. Load from namespace" {
 *         -d-> [true] "Iterating of\n<i>require.path</i>,\n<i>new Module(namespace, path);</i>"
 *         -d-> SaveInCache
 *       }
 *
 *     else
 *       partition "3. Load from file" {
 *         -r-> [false] "<i>new Module(null,</i>\n<i>namespace);</i>"
 *         --> Return
 *       }
 *     endif
 *   endif
 * endif
 *
 * NS --> Return
 * Return -d-> (*)
 * @enduml
 *
 * @startuml
 * object require.proto {
 * }
 *
 * package "path/to/first/dir" #DFDFDF-ffffff {
 *   object "user.settings" as Settings_1 << (E,orchid) >> {
 *     +someMethod1()
 *     +someMethod2()
 *   }

 *   object "geo" as Geo_1 << (E,orchid) >> {
 *     +someField1 = someValue
 *   }
 * }
 *
 * package "path/to/second/dir" #DFDFDF-ffffff {
 *   object "user.settings" as Settings_2 << (E,orchid) >> {
 *     +someMethod3()
 *   }
 *
 *   object "geo" as Geo_2 << (E,orchid) >> {
 *     +someField2 = someValue
 *   }
 * }
 *
 * require.proto <-- Settings_1
 * require.proto <-- Geo_1
 *
 * Settings_1 <-- Settings_2
 * Geo_1 .. Geo_2
 *
 * note top of Geo_1
 *   this.someField1 = someValue;
 * end note
 *
 * note top of Settings_1
 *   this.someMethod1 = function () {};
 *   this.someMethod2 = function () {};
 * end note
 *
 * note bottom of Geo_2
 *   module.exports = {someField2: someValue};
 * end note
 *
 * note bottom of Settings_2
 *   this.someMethod3 = function () {};
 *   // or
 *   module.exports.someMethod3 = function () {};
 * end note
 * @enduml
 *
 * @startuml
 * note left: module.load(dir);
 * (*) -d-> if "" then
 *   note left: Есть ли\nпространство имён?
 *   -r-> [<b>true</b>\n<i>dir += namespace</i>\n<i>path = dir</i>] "<b>PATH_TO_DIR</b>\nПоиск директории <i>path</i>" as PathToDir
 *   else
 *   -d-> [<b>false</b>\n<i>path = dir</i>] "<b>PATH_TO_FILE</b>\nПоиск файла <i>path</i>" as PathToFile
 * endif
 *
 * PathToDir -d-> if "" then
 *     note right: Found?
 *   --> [<b>true</b>\n<i>path = dir + require.packageName</i>] "<b>PATH_TO_PACKAGE</b>\nПоиск JSON-файла <i>path</i>" as PathToPackage
 *   else
 *   --> [<b>false</b>\n<i>path = dir + '.' + require.extension</i>] PathToFile
 * endif
 *
 * PathToPackage --> if "" then
 *   note right: Found?
 *   --> [<b>true</b>\n<i>path = dir + '/' + package.main</i>] "<b>PATH_TO_MAIN</b>\nПоиск входного файла модуля <i>path</i>" as PathToMain
 *   else
 *   -l-> [<b>false</b>\n<i>path = dir + '/' + namespace + '.' + require.extension</i>] PathToFile
 * endif
 *
 * PathToMain --> if "" then
 *   note right: Found?
 *   -l-> [<b>true</b>] "Загрузка файла из <i>path</i>" as Load
 *   else
 *   --> [<b>false</b>\n<i>Can`t find main file</i>] "<i>throw require.Error</i>" as require.Error
 * endif
 *
 * PathToFile -d-> if "" then
 *   note left: Found?
 *   -r-> [<b>true</b>] Load
 *   else
 *   --> [<b>false</b>\n<i>Cant find module</i>] require.Error
 * endif
 *
 * Load --> if "" then
 *   note left: Loaded?
 *   -r-> [<b>true</b>] (*)
 *   else
 *   --> [<b>false</b>\n<i>Can`t load module file</i>] require.Error
 * endif
 * @enduml
 */
