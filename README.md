Implementation require for XScript and client-side
===============
### Version: 1.7

### Lisence: [MIT](https://github.com/appendto/amplify/blob/master/MIT-LICENSE.txt)

### Features:

* Поддержка выполнения модулей в браузере.
* В окружении XScript-а загружает модуль по его namespace или локальному пути. Логика поиска файлов реализована в {@link Module#load}. Исходный код модуля выполняется один раз и далее отдается из внутреннего кеша.
* Поддерживается регистрация модулей через метод {@link require}.define.
* Реализует поддержку пространств имен модулей и сохраняет все загруженные модули в глобальном объекте {@link $XM} в соответствии с их {@link Module#namespace}.
* Поддерживается наследование и переопределение и модулей через {@link require}.path.
* Поддерживается рекурсивный вызов require.

За создание и инициализацию модуля отвечает конструктор {@link Module}.

Документация в формате JSDoc 3, сборка относительно корня: `path/to/jsdoc/tool -c conf.json README.md`.
