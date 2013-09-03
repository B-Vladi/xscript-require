/**
 * @file Implementation require for XScript and client-side.
 * @author Vlad Kurkin <b-vladi@yandex-team.ru>
 * @version 1.6
 * @license <a href="https://github.com/appendto/amplify/blob/master/MIT-LICENSE.txt">MIT</a>
 */

/**
 * Пространство имен XJS-модулей.
 * @namespace $XM
 * @see require
 */
var $XM = {};

/**
 * @description Implementation require for XScript and client-side. See {@tutorial README}.
 * <br />Алгоритм работы require:
 * <br /><img src="../uml/Work.png" />
 * <br />Схема наследования модулей:
 * <br /><img src="../uml/Inherit.png" />
 * @param {String} namespace Пространство имен модуля или путь к JavaScript-файлу. Пространство имен представляет собой строку имён, разделённых точкой. Имя должно начинаться с буквы, затем могут идти символы латинского алфавита и знаки "-_". В случае передачи пути, require воспринимает это как обращение к подмодулю (см. диаграмму алгоритма работы в исходниках), инициализируя свойство {@link Module#parent}.
 * @tutorial README
 * @function require
 * @global
 * @return {Object} Объект {@link Module#exports}.
 * @property {Array} [path=[]] Массив путей с директориями, в которых будут искаться файлы модулей на серверной стороне. Каждый путь представляет собой уровень переопределения, выстраивающий соответствующую цепочку наследования модулей из одного пространства имен.
 * @property {String} [extension='js'] Расширение файлов модулей. См {@link Module#load}.
 * @property {String} [packageName='package.json'] Имя JSON-файла, содержащий информацию о модуле. См {@link Module#load}.
 * @property {Object} [file=xscript.file] Объект с методами доступа к файловой системе. Существует только на серверной стороне.
 * @property {Object} prototype Общий прототип объектов API модулей ({@link Module#exports}).
 * @property {Function} define(namespace,wrapper) Регистрирует модуль по указанному namespace в первом параметре. Вторым параметром должена быть функция, которая принимает 4 аргумента (см. {@link Module#compile}) и содержит в себе тело модуля. Вызов метода require.define не инициализирует модуль (функция wrapper не вызывается). Инициализация происходит в момент первого обращения к модулю через вызов require. Все аргументы обязательны.
 * @throws {RequireError} Ошибка получения модуля.
 * @example
 * // Загрузка модуля из разных уровней переопределения:
 * require.path = ['/path/to/first/dir/', './path/to/second/dir'];
 * require('name.space');
 * // В этом случае объект API модуля, загруженного из файла "path/to/second/dir/names.space.js"
 * // будет наследовать от API модуля, загруженного из "/path/to/first/dir/names.space.js".
 *
 * // Доступ к модулям из пространства имен:
 * require('some.name.space');
 * $XM.some.name.space; // объект {@link Module#exports}.
 *
 * // Регистрация модуля в браузере:
 * require.define('name.space', function (module, exports, require, basedir) {
 *     // Тело модуля
 * });
 */

var require = (function () {
    var
        MODULE_CACHE = {},
        WRAPPER_CACHE = {},
        STACK = [],
        NSRegExp = /^([a-z]+[a-z\-_]*)(?:\.[a-z]+[a-z\-_]*)*$/i,
        parent = null,
        undefined;

    function requireFactory(module) {
        function Wrapper(namespace) {
            parent = module;
            return Require(namespace);
        }

        Wrapper.path = Require.path;
        Wrapper.extension = Require.extension;
        Wrapper.packageName = Require.packageName;
        Wrapper.file = Require.file;
        Wrapper.define = Require.define;
        Wrapper.prototype = Require.prototype;

        return Wrapper;
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
            currentNamespace = $XM;

        while (index < length) {
            name = namespace[index++];

            if (index === length) {
                currentNamespace[name] = module.exports;
            } else if (!currentNamespace.hasOwnProperty(name)) {
                currentNamespace[name] = {};
            }

            currentNamespace = currentNamespace[name];
        }
    }

    function RequireError(message, error) {
        if (error) {
            message += ' Reason: "' + error + '".';
        }

        STACK.pop();

        if (STACK.length) {
            message += ' Module Stack: "' + STACK.join(', ') + '". ';
        }

        this.message = message;

        STACK.length = 0;
    }

    RequireError.prototype = new Error();
    RequireError.prototype.name = 'RequireError';

    function Exports() {
    }

    /**
     * Конструктор объекта модуля.
     * @summary <img src="../uml/Module.png" alt="" />
     * @name Module
     * @constructor
     * @private
     * @param {String} [namespace=undefined] Пространство имен модуля.
     * @param {String} [path=undefined] Путь к файлу или дирректории, по которому он будет загружен.
     * @throws {RequireError} Ошибка создания модуля.
     */
    function Module(namespace, path) {
        /**
         * Функция загрузки модуля, аналогична {@link require}.
         * @param {String} namespace См. {@link require}.
         * @name Module#require
         * @method
         */
        this.require = requireFactory(this);

        /**
         * Реализация модуля, являющаяся его внешним API. По-умолчанию этот объект наследует от {@link Module#prototype}. Для того, что бы разорвать наследование между уровнями переопределения, достаточно заменить значение этого свойства (см. диаграмму с примером наследования в исходниках).
         * @name Module#exports
         * @type {Object}
         */
        this.exports = new Exports();

        /**
         * Ссылка на прототип объекта {@link Module#exports}. Концом цепочки наследования является {@link require}.prototype, если не было переопределено свойство {@link Module#exports} на каком-либо уровне переопределения.
         * @name Module#prototype
         * @type {Object}
         * @example
         * // Исходный код модуля, находящегося на втором уровне переопределения.
         * // Перекрытие наследуемого метода.
         * this.log = function (string) {
             *   // Вызов исходного метода
             *   return module.prototype.log('[LOG]: ' + string);
             * }
         */
        this.prototype = Exports.prototype;

        /**
         * Ссылка на JSON-объект, загруженный из {@link require}.packageName.
         * @name Module#package
         * @default null
         * @type {Object}
         */
        this.package = null;

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
     * Загружает код модуля из папки dir на серверной стороне. Поиск кода осуществляется последовательно в местах:
     * <br /><br />
     * Если модуль имеет пространство имён:
     * <ol>
     *   <li>Ищется папка с именем пространства имён.</li>
     *   <li>Если папка найдена, в ней ищется JSON-файл с именем, указанным в {@link require}.packageName.</li>
     *   <li>Если JSON-файл найден и в нем определено свойство main с именем входного файла, ищется указанный файл в текущей папке</li>
     *   <li>Если JSON-файл отсутствует, в текущей папке ищется файл, имя которого совпадает с пространством имен модуля с расширением, указанным в {@link require}.extension.</li>
     * </ol>
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
     * @name Module#load
     * @throws {Error|RequireError} Ошибка загрузки кода.
     * @method
     */
    Module.prototype.load = function (dir) {
        var
            PATH_TO_FILE = 1,
            PATH_TO_PACKAGE = 2,
            PATH_TO_DIR = 3,
            PATH_TO_MAIN = 4;

        var
            namespace = this.namespace,
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
                        path = dir + Require.packageName;
                        state = PATH_TO_PACKAGE;
                        break;

                    case PATH_TO_PACKAGE:
                        try {
                            this.package = require.file.load(path);
                        } catch (error) {
                            throw new RequireError('Can`t load JSON file: "' + path + '".', error);
                        }

                        try {
                            this.package = JSON.parse(stripBOM(this.package));
                        } catch (error) {
                            throw new RequireError('Can`t parse JSON file: "' + path + '".', error);
                        }

                        path = dir + '/' + (this.package.hasOwnProperty('main') ? this.package.main : namespace + '.' + Require.extension);
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
                        path = dir + '.' + Require.extension;
                        state = PATH_TO_FILE;
                        break;

                    case PATH_TO_PACKAGE:
                        path = dir + '/' + namespace + '.' + Require.extension;
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
     * </pre>
     * @param {String} [source=Module#source] Исходный код модуля.
     * @return {Function} Скомпилированная функция-обертка модуля.
     * @throws {RequireError} Ошибка компиляции с указанием причины.
     * @method
     * @name Module#compile
     */
    Module.prototype.compile = function (source) {
        if (typeof source === 'string') {
            this.source = source;
        }

        try {
            return new Function('module', 'exports', 'require', 'basedir', this.source);
        } catch (error) {
            throw new RequireError('Compilation error module.', error);
        }
    };

    /**
     * Инициализирует модуль. Код модуля выполняется в контексте {@link Module#exports}.
     * @since 1.6
     * @param {Function} wrapper Функция, в которой содержится тело модуля.
     * @throws {RequireError} Ошибка инициализации.
     * @returns {Module} Объект {@link Module}.
     * @method
     * @name Module#init
     */
    Module.prototype.init = function (wrapper) {
        STACK.push(this.path);

        if (typeof wrapper === 'function') {
            try {
                wrapper.call(this.exports, this, this.exports, this.require, this.basedir);
            } catch (error) {
                if (!(error instanceof RequireError)) {
                    error = new RequireError('Cant init module "' + this.path + '".', error);
                }

                throw error;
            }
        } else {
            throw new RequireError('Error initializing module.', 'Wrapper is not a function');
        }

        STACK.pop();

        return this;
    };

    function Require(namespace) {
        var
            module,
            index = 0,
            pathsLength = Require.path.length,
            path;

        if (typeof namespace !== 'string' || namespace === '') {
            throw new RequireError('Namespace must be non-empty string.');
        }

        if (MODULE_CACHE.hasOwnProperty(namespace)) {
            return MODULE_CACHE[namespace];
        }

        if (WRAPPER_CACHE.hasOwnProperty(namespace)) {
            module = new Module(namespace, undefined).init(WRAPPER_CACHE[namespace]);

            createNamespace(module);

            delete WRAPPER_CACHE[namespace];
        } else if (NSRegExp.test(namespace)) {

            while (index < pathsLength) {
                Exports.prototype = module ? module.exports : Require.prototype;
                path = Require.path[index++];

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
                throw new RequireError('Cant find module "' + namespace + '" in paths: "' + Require.path.join(', ') + '".');
            }
        } else {
            return new Module(undefined, namespace).exports;
        }

        MODULE_CACHE[namespace] = module.exports;

        return module.exports;
    }

    Require.path = [];
    Require.extension = 'js';
    Require.packageName = 'package.json';
    Require.prototype = Exports.prototype;

    try {
        Require.file = xscript.file;
    } catch (error) {
        // Находимся в браузере, всё ок.
    }

    Require.define = function (namespace, module) {
        if (typeof namespace !== 'string' || namespace === '') {
            throw new RequireError('Module namespace must be a non-empty string.');
        }

        if (NSRegExp.test(namespace)) {
            throw new RequireError('First argument is not a namespace.');
        }

        if (typeof module !== 'function') {
            throw new RequireError('Module is not a function.');
        }

        WRAPPER_CACHE[namespace] = module;
    };

    return Require;
}());

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
 * object require.prototype {
 * }
 *
 * object Exports.prototype {
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
 * Exports.prototype <-- Settings_1
 * Exports.prototype <-- Geo_1
 *
 * require.prototype <-- Exports.prototype
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
 *   --> [<b>true</b>\n<i>path = dir + Require.packageName</i>] "<b>PATH_TO_PACKAGE</b>\nПоиск JSON-файла <i>path</i>" as PathToPackage
 *   else
 *   --> [<b>false</b>\n<i>path = dir + '.' + Require.extension</i>] PathToFile
 * endif
 *
 * PathToPackage --> if "" then
 *   note right: Found?
 *   --> [<b>true</b>\n<i>path = dir + '/' + package.main</i>] "<b>PATH_TO_MAIN</b>\nПоиск входного файла модуля <i>path</i>" as PathToMain
 *   else
 *   -l-> [<b>false</b>\n<i>path = dir + '/' + namespace + '.' + Require.extension</i>] PathToFile
 * endif
 *
 * PathToMain --> if "" then
 *   note right: Found?
 *   -l-> [<b>true</b>] "Загрузка файла из <i>path</i>" as Load
 *   else
 *   --> [<b>false</b>\n<i>Can`t find main file</i>] RequireError
 * endif
 *
 * PathToFile -d-> if "" then
 *   note left: Found?
 *   -r-> [<b>true</b>] Load
 *   else
 *   --> [<b>false</b>\n<i>Cant find module</i>] RequireError
 * endif
 *
 * Load --> if "" then
 *   note left: Loaded?
 *   -r-> [<b>true</b>] (*)
 *   else
 *   --> [<b>false</b>\n<i>Can`t load module file</i>] RequireError
 * endif
 * @enduml
 */
