Implementation require for XScript
===============
### Version: 1.4

### Lisence: [MIT](https://github.com/appendto/amplify/blob/master/MIT-LICENSE.txt)

### Features:

* Загружает модуль по его namespace или абсолютному пути. Логика поиска файлов реализована в {@link Module#load}. Исходный код модуля выполняется один раз и далее отдается из внутреннего кеша.
* Реализует поддержку пространств имен модулей и сохраняет все загруженные модули в глобальном объекте {@link $XM} в соответствии с их {@link Module#namespace}.
* Поддерживает уровни переопределения и наследование модулей через {@link require}.path.

За создание и инициализацию модуля отвечает конструктор {@link Module}.

Документация в формате JSDoc 3, сборка относительно корня: `path/to/jsdoc/tool -c conf.json`.
