// элементы страницы
var selGroups = '#groups';
var inpOwner = '#groupID';
var btnExec = 'input#execute';
var selFilter = '#filter';
var divPosts = "#posts";  // контейнер для постов
var inpCount = '#count';  // количество записи для поиска
var inpCountOut = '#countOut';  // количество записей для вывода
var inpOffset = '#offset';  // смещение записей
var selSort = '#sort';
var chbIsContent = '#isContent';
var btnAddPosts = '#btn_add_posts';

var reLink = /([-a-zA-Z0-9@:%_\+.~#?&\/\/=]{2,256}\.[a-z]{2,4}\b(\/?[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)?)/gi;  // CHECK

var posts;  // полученные посты
var countOut;  // количество постов на вывод
var typeOfSort;  // тип сортировки
var isContent;  // необходимость вывода прикреплений
var code = '';

var htmlTemplate = {
    postStart:          '<div class="panel panel-default"><div class="list-group">',
    postEnd:            '<p class="list-group-item">' +
                            '<button title="Лайки" class="btn action" type="button" disabled="disabled">' +
                               '<span class="glyphicon glyphicon-heart" aria-hidden="true"></span> {0}' +
                            '</button>' +
                            '<button title="Репосты" class="btn action" type="button" disabled="disabled">' +
                               '<span class="glyphicon glyphicon-bullhorn" aria-hidden="true"></span> {1}' +
                            '</button>' +
                            '<button title="Скорость" class="btn action" type="button" disabled="disabled">' +
                               '<span class="glyphicon glyphicon-dashboard" aria-hidden="true"></span> {2}' +
                            '</button>' +
                        '</p>' +
                        '<p class="list-group-item">' +
                            '<span title="Дата создания записи" class="action">{3}</span>' +
                            '<a title="Открыть запись в новом окне" class="btn action" href="https://vk.com/wall{4}_{5}" target="_blank" role="button">' +
                                'Перейти к записи' +
                            '</a>' +
                        '</p>' +
                        '</div></div>',
    blockPhotoStart:    '<div class="list-group-item"><div class="row">',
    blockPhotoEnd:      '</div></div>',
    blockAudioStart:    '<div class="list-group-item">',
    audio:              '<audio src="{0}" controls></audio>',
    blockAudioEnd:      '</div>'
};

var i, j, k;


function upd_group_list(data) {
    // ОБНОВЛЕНИЯ СПИСКА ГРУПП В ВЫПАДАЮЩЕМ СПИСКЕ
    if (isError(data)) return;
    var groups = data['response']['items'];
    // добавляем группы в выпадающий список
    var options = '';
    $(selGroups).empty();  // очищаем список
    for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        options += '<option value="-{0}">{1}</option>'.format(group['id'], group['name']);
    }
    $(selGroups).append(options);
    $(btnExec).prop("disabled", false);
}


function displayPosts() {
    // ВЫВОД ПОСТОВ
    countOut = Number($(inpCountOut).val());
    typeOfSort = $(selSort).val();  // вид сортировки
    isContent = $(chbIsContent).prop("checked");  // необходимость показа прикреплений

    console.log('Записи: ', posts);
    if (isError(posts)) return;
    $(divPosts).empty();
    if (posts.length == 0) {
        alert('Записей не найдено');
        return;
    }
    // расчёт скорости набора лайков
    var currentTime= new Date().getTime() / 1000;
    for (i = 0; i < posts.length; i++) {
        // скорость = количество лайков / (текущая дата - дата публикации записи) [1/день]
        posts[i]['speed'] = Number((posts[i]['likes']['count'] / (currentTime - posts[i]['date']) * 86400).toFixed(2));
    }
    // сортировка записей
    if (typeOfSort == 'byLikes') {
        posts.sort(sort_RevByLikes);
    }
    else if (typeOfSort == 'byReposts'){
        posts.sort(sort_RevByReposts);
    }
    else if (typeOfSort == 'bySpeed') {
        posts.sort(sort_RevBySpeed);
    }
    console.log('На вывод: ', posts);
    var code = '';
    for (i = 0; i < countOut; i++) {
        code += make_post(posts[i])
    }

    $(divPosts).append($( code ));
    // разблокировка кнопки выборки
    $(btnExec).val('Произвести выборку');
    $(btnExec).prop("disabled", false);
    $(btnAddPosts).prop("disabled", false);
    $(btnAddPosts).css("display", 'inline-block');
    resize_frame();
}


function make_post(post) {
    // СОЗДАНИЕ HTML-КОДА ДЛЯ ПОСТА
    // function addZero(val) {
    //     val = String(val);
    //     return (val.length == 1) ? '0' + val : val;
    // }

    // составление даты записи
    var date = new Date(post['date'] * 1000);
    var day = String(date.getDate());
    var month = String(Number(date.getMonth()) + 1);
    var minutes = String(date.getMinutes());
    day = (day.length == 1) ? '0' + day : day;
    month = (month.length == 1) ? '0' + month : month;
    minutes = (minutes.length == 1) ? '0' + minutes : minutes;
    date = day + '.' + month + '.' + date.getFullYear()  + ' ' + date.getHours()  + ':' + minutes;

    // начало записи
    code += htmlTemplate.postStart;
    // если имеется текст
    if (post['text'].length > 0 && isContent) {
        // заменяем ссылке в тексте на реальные, добавляем переносы строк
        var text = post['text']
            .replace(reLink, function(s){
                var str = (/:\/\//.exec(s) === null ? "http://" + s : s );  // CHECK
                return '<a href="'+ str + '">' + s + '</a>';
            })
            .replace(/\n/g, '<br>');
        code +=
            '<p class="list-group-item">' +
            text +
            '</p>'
    }
    // если имеются прикрепления
    // REVIEW
    if (post['attachments'] && isContent) {
        // списки с каждым типом прикреплений
        // TODO другие виды прикреплений
        var listPhoto = post['attachments'].filter( function(attach) {
                return attach.type == 'photo'
            } );
        var listAudio = post['attachments'].filter( function(attach) {
                return attach.type == 'audio'
            } );
        //var listVideo = post['attachments'].filter(function(attach) {
        //return attach.type == 'video'
        //});

        if (listPhoto.length > 0) {
            // console.log('Изображения: ', listPhoto);
            // начало блока
            code += htmlTemplate.blockPhotoStart;
            for (j = 0; j < listPhoto.length; j++) {
                var photo = listPhoto[j]['photo'];
                // поиск версии изображения с наибольшим разрешением
                var linkBigPhoto;
                var resolution = [2560, 1280, 807, 604, 130, 75];  // возможные разрешения
                for (k = 0; k < resolution.length; k++) {
                    if (photo['photo_' + resolution[k]]) {
                        linkBigPhoto = photo['photo_' + resolution[k]];
                        break;
                    }
                }
                // TODO
                code += '<div class="col-xs-2">' +
                            '<a href="' + linkBigPhoto + '" target="_blank"><img src="' + (photo['photo_130'] ? photo['photo_130'] : photo['photo_75']) + '" width="auto" height="70"></a>' +
                        '</div>';
            }
            // конец блока
            code += htmlTemplate.blockPhotoEnd;
        }
        if (listAudio.length > 0) {
            // console.log('Аудио: ', listAudio);
            // начало блока
            code += htmlTemplate.blockAudioStart;
            for (j = 0; j < listAudio.length; j++) {
                var audio = listAudio[j]['audio'];
                if (audio['url'] == 0) {continue}  // если не указан url аудиозаписи
                code += htmlTemplate.audio.format(audio['url']);
            }
            // конец блока
            code += htmlTemplate.blockAudioEnd;
        }

        //if (listVideo.length > 0) {
        //    console.log('Видео: ', listVideo);
        //    // начало блока
        //    code += '<div class="list-group-item">';
        //    for (var k = 0; k < listPhoto.length; k++) {
        //        var video = listVideo[k];
        //        code += '<div class="embed-responsive embed-responsive-16by9">' +
        //            '<iframe src="//vk.com/video_ext.php?oid=' + video.video.owner_id + '&id=' + video.video.id + '&hash=' + video.video.access_key + '"></iframe>' +
        //            '</div>';
        //        console.log('<div class="embed-responsive embed-responsive-16by9">' +
        //            '<iframe src="//vk.com/video_ext.php?oid=' + video.video.owner_id + '&id=' + video.video.id + '&hash=' + video.video.access_key + '"></iframe>' +
        //            '</div>');
        //    }
        //    // конец блока
        //    code += '</div>';
        //}
    }
    // конец записи
    code += htmlTemplate.postEnd.format(post['likes']['count'],
                                        post['reposts']['count'],
                                        post['speed'],
                                        date,
                                        post['from_id'],
                                        post['id']);
    return code;
}


function sort_RevByLikes(a, b) {
    if (a['likes']['count'] < b['likes']['count']) return 1;
    else if (a['likes']['count'] > b['likes']['count']) return -1;
    else return 0;
}


function sort_RevByReposts(a, b) {
    if (a['reposts']['count'] < b['reposts']['count']) return 1;
    else if (a['reposts']['count'] > b['reposts']['count']) return -1;
    else return 0;
}


function sort_RevBySpeed(a, b) {
    if (a['speed'] < b['speed']) return 1;
    else if (a['speed'] > b['speed']) return -1;
    else return 0;
}


// ПОЛУЧЕНИЕ СПИСКА ЗАПИСЕЙ
$(btnExec).click(function() {
    // блокировка кнопки выборки
    $(btnExec).prop("disabled", true);
    $(btnExec).val('[ обновляется ]');

    var ownerInfo = $(inpOwner).val();
    var count = Number($(inpCount).val());  // количество записей для анализа
    var offset = Number($(inpOffset).val());  // смещение  для выборки записей
    var filter = $(selFilter).val();
    var id = '';
    var domain = '';

    if (ownerInfo.length > 0) {
        // извлечение идентификатора страницы
        // TODO дописать для адресов типа club, public
        if (ownerInfo.search(/^-?[0-9]+$/) != -1) {
            id = ownerInfo;
        }
        else {
            var _ = ownerInfo.search('vk.com/');
            if (_ != -1) {
                domain = ownerInfo.slice(_ + 7);
            }
            else {
                domain = ownerInfo;
            }
        }
    }
    else {
        id = $(selGroups).val();
    }

    // ФОРМИРОВАНИЕ ЗАПРОСА НА ПОЛУЧЕНИЕ ПОСТОВ
    if (count > 100) {
        _ = (id.length > 0) ? ('owner_id: ' + id) : ('domain: "' + domain + '"');
        var query = 'var posts;' +
                    'var offset = ' + offset + ';' +
                    'var tmpParam;' +
                    'var countPosts;' +  // количество записей на стене
                    'var countQuery = 0;' +  // количество выполненных запросов к api (ограничение в 25)
                    'var count = ' + count + ';' +
                    'tmpParam = API.wall.get({' + _ + ', count: 100, offset: offset, filter: "' + filter + '"});' +
                    'posts = tmpParam.items;' +
                    'countPosts = tmpParam.count;' +
                    'if (countPosts <= 100) {' +
                    'return posts;' +
                    '}' +
                    'offset = offset + 100;' +
                    'while(posts.length < count && countQuery < 24) {' +
                    'tmpParam = API.wall.get({' + _ + ', count: 100, offset: offset, filter: "' + filter + '"});' +
                    'posts = posts + tmpParam.items;' +
                    'if (tmpParam.count < 100) {return posts;}' +
                    'countQuery = countQuery + 1;' +
                    'offset = offset + 100;' +
                    '}' +
                    'return posts;';
        // console.log('execute-запрос: ', query);
        VK.api(
            'execute',
            {code: query},
            function(data) {
                posts = data['response'];
                displayPosts();
            }
        );
    }
    // else if (count > 2500) {
        // TEMP дописать
    // }
    else {
        var params = (id.length > 0)
                     ? {owner_id: id, count: count, filter: filter, offset: offset}
                     : {domain: domain, count: count, filter: filter, offset: offset};
        VK.api(
            'wall.get',
            params,
            function(data) {
                if (isError(data)) return;
                posts = data['response']['items'];
                displayPosts();
            }
        );
    }
});


// кнопка отображения дополнительных постов (+10)
$(btnAddPosts).click( function () {
    var code = '';
    for (var i = 0; i < 10; i++) {
        countOut += 1;
        if (posts.length <= countOut) {
            $(btnAddPosts).prop("disabled", true);
            break;
        }
        code += make_post(posts[countOut]);
    }
    $(divPosts).append(code);
    resize_frame();
});


// очищение поля для ссылки при выборе группы из выпад. списка
$(selGroups).change(function() {
    $(inpOwner).val('');
});
