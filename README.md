Implementation require for XScript 1.1
===============

За создание и инициализацию модуля отвечает конструктор [Module](/b-vladi/xscript-require/blob/master/require.js#L37-L127).

### Фичи:

* Загружает модуль по его namespace или абсолютному пути. Логика поиска файлов реализована в [Module#load](/b-vladi/xscript-require/blob/master/require.js#L129-L223). Исходный код модуля выполняется один раз и далее отдается из внутреннего кеша.
* Реализует поддержку пространств имен модулей и сохраняет все загруженные модули в глобальном объекте [$XM](/b-vladi/xscript-require/blob/master/require.js#L7-L13) в соответствии с их [Module#namespace](/b-vladi/xscript-require/blob/master/require.js#L101-L106).
* Поддерживает уровни переопределения и наследование модулей через [require.path](/b-vladi/xscript-require/blob/master/require.js#L280).
