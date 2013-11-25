Implementation require for XScript and client-side
===============
### Version: 1.9

### Lisence: [MIT](https://github.com/appendto/amplify/blob/master/MIT-LICENSE.txt)

### Features:

* Поддержка выполнения модулей в браузере.
* В окружении XScript-а загружает модуль по его namespace или локальному пути. Логика поиска файлов реализована в {Module#load}. Исходный код модуля выполняется один раз и далее отдается из внутреннего кеша.
* Поддерживается регистрация модулей через метод {require.define}.
* Реализует поддержку пространств имен модулей. По-умолчанию ссылки на модули сохраняются во внутренний объект {require.global}. С помощью функции {require.setModuleNameSpace} вы можете создать именованное пространситво имен в глобальном объекте вашего окружения.
* Поддерживается наследование и переопределение и модулей через {require.path}.
* Поддерживается рекурсивный вызов require.

За создание и инициализацию модуля отвечает конструктор {Module}.

###Примеры из JSDoc:

####Загрузка модуля из разных уровней переопределения:
    require.path = ['/path/to/first/dir/', './path/to/second/dir'];
    require('name.space');

В этом случае объект {Module#exports}, из модуля "path/to/second/dir/names.space.js", будет наследовать от объекта {Module#exports}, из модуля "/path/to/first/dir/names.space.js".

####Доступ к модулям из глобального пространства имен:

    require('some.name.space');
    $XM.some.name.space; // TypeError: объект $XM не найден в глобальном объекте.

Имя можно регистрировать и после вызова require

    require.setModuleNameSpace('$XM');
    $XM.some.name.space; // объект {Module#exports}.

####Регистрация модуля в браузере:

    require.define('name.space', function (module, exports, require, basedir) {
        // Тело модуля
    });

####Пример рекурсивного вызова модулей:

    // Вызов модуля из глобального контекста:
    var A = require('A');
    // Рекурсии нет, выполнение продолжается

    // Код модуля "A":
    var B = require('B');

    // Записываем свойство в нативный {@link Module#exports}
    this.field = 'value';

    // Код модуля "B":
    // Рекурсивный вызов модуля "A"
    var A = require('A');

    A.field; // undefined, модуль ещё не инициализирован.

    this.method = function () {
        //
        return A.field; // 'value'
    }

####Документация в формате JSDoc 3, сборка относительно корня: `path/to/jsdoc/tool -c conf.json README.md`.
